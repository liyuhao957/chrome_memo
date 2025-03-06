// 扩展安装时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addEditMemo",
    title: "添加/编辑备忘录",
    contexts: ["page"]
  });
  
  chrome.contextMenus.create({
    id: "toggleMemo",
    title: "显示/隐藏备忘录",
    contexts: ["page"]
  });
  
  // 添加选中文本功能的开关菜单项
  chrome.contextMenus.create({
    id: "toggleQuickAdd",
    title: "启用选中文本添加",
    contexts: ["page"],
    type: "checkbox",
    checked: true  // 默认启用
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const domain = new URL(tab.url).hostname;
  
  if (info.menuItemId === "addEditMemo") {
    // 发送消息到content script启动编辑器
    chrome.tabs.sendMessage(tab.id, {
      action: "openEditor",
      domain: domain
    });
  } else if (info.menuItemId === "toggleMemo") {
    // 发送消息到content script切换备忘录显示/隐藏
    chrome.tabs.sendMessage(tab.id, {
      action: "toggleMemo",
      domain: domain
    });
  } else if (info.menuItemId === "toggleQuickAdd") {
    // 保存设置状态
    chrome.storage.local.set({ enableQuickAdd: info.checked }, () => {
      // 更新菜单项标题
      chrome.contextMenus.update("toggleQuickAdd", {
        title: "启用选中文本添加"
      });
      
      // 通知当前标签页更新设置
      chrome.tabs.sendMessage(tab.id, {
        action: "updateQuickAddSetting",
        isEnabled: info.checked
      });
    });
  }
});

// 在扩展启动时恢复设置状态
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['enableQuickAdd'], (result) => {
    const isEnabled = result.enableQuickAdd !== false;
    chrome.contextMenus.update("toggleQuickAdd", {
      title: "启用选中文本添加",
      checked: isEnabled
    });
  });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveMemo") {
    // 保存备忘录内容到storage
    const memoData = {
      content: message.content,
      isVisible: true,
      lastEdited: Date.now()
    };
    
    chrome.storage.local.get("memos", (result) => {
      const memos = result.memos || {};
      memos[message.domain] = memoData;
      
      chrome.storage.local.set({ memos }, () => {
        sendResponse({ success: true });
      });
    });
    
    return true; // 保持消息通道开放直到sendResponse调用
  } else if (message.action === "getMemo") {
    // 获取指定域名的备忘录
    chrome.storage.local.get("memos", (result) => {
      const memos = result.memos || {};
      sendResponse({ data: memos[message.domain] || null });
    });
    
    return true; // 保持消息通道开放直到sendResponse调用
  } else if (message.action === "updateMemoVisibility") {
    // 更新备忘录可见性
    chrome.storage.local.get("memos", (result) => {
      const memos = result.memos || {};
      if (memos[message.domain]) {
        memos[message.domain].isVisible = message.isVisible;
        chrome.storage.local.set({ memos }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: "Memo not found" });
      }
    });
    
    return true; // 保持消息通道开放直到sendResponse调用
  } else if (message.action === "getAllMemos") {
    chrome.storage.local.get("memos", (result) => {
      console.log("获取所有备忘录:", result.memos || {});
      sendResponse({ data: result.memos || {} });
    });
    return true; // 保持通道开放
  } else if (message.action === "deleteMemo") {
    chrome.storage.local.get("memos", (result) => {
      const memos = result.memos || {};
      if (memos[message.domain]) {
        delete memos[message.domain];
        chrome.storage.local.set({ memos }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: "Memo not found" });
      }
    });
    return true; // 保持通道开放
  } else if (message.action === "saveTemplate") {
    // 保存模板
    chrome.storage.local.get("templates", (result) => {
      const templates = result.templates || {};
      templates[message.name] = {
        content: message.content,
        createdAt: Date.now()
      };
      
      chrome.storage.local.set({ templates }, () => {
        sendResponse({ success: true });
      });
    });
    return true; // 保持通道开放
    
  } else if (message.action === "getTemplate") {
    // 获取指定名称的模板
    chrome.storage.local.get("templates", (result) => {
      const templates = result.templates || {};
      sendResponse({ data: templates[message.name] || null });
    });
    return true; // 保持通道开放
    
  } else if (message.action === "getAllTemplates") {
    // 获取所有模板
    chrome.storage.local.get("templates", (result) => {
      sendResponse({ data: result.templates || {} });
    });
    return true; // 保持通道开放
    
  } else if (message.action === "deleteTemplate") {
    // 删除模板
    chrome.storage.local.get("templates", (result) => {
      const templates = result.templates || {};
      if (templates[message.name]) {
        delete templates[message.name];
        chrome.storage.local.set({ templates }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: "Template not found" });
      }
    });
    return true; // 保持通道开放
  }
});

// 确保已请求存储权限
chrome.permissions.contains({
  permissions: ['storage']
}, (hasPermission) => {
  if (!hasPermission) {
    console.warn('网站备忘录需要存储权限来保存位置信息');
  }
});

// 添加快捷键监听
chrome.commands.onCommand.addListener((command) => {
  // 获取当前活动标签页
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentTab = tabs[0];
    const domain = new URL(currentTab.url).hostname;

    switch(command) {
      case 'toggle-memo':
        // 发送消息到content script切换备忘录显示/隐藏
        chrome.tabs.sendMessage(currentTab.id, {
          action: "toggleMemo",
          domain: domain
        });
        break;

      case 'open-editor':
        // 发送消息到content script启动编辑器
        chrome.tabs.sendMessage(currentTab.id, {
          action: "openEditor",
          domain: domain
        });
        break;

      case 'toggle-quick-add':
        // 获取当前设置状态并切换
        chrome.storage.local.get(['enableQuickAdd'], (result) => {
          const newState = !result.enableQuickAdd;
          chrome.storage.local.set({ enableQuickAdd: newState }, () => {
            // 更新菜单项状态
            chrome.contextMenus.update("toggleQuickAdd", {
              checked: newState
            });
            
            // 通知当前标签页更新设置
            chrome.tabs.sendMessage(currentTab.id, {
              action: "updateQuickAddSetting",
              isEnabled: newState
            });
          });
        });
        break;
    }
  });
}); 