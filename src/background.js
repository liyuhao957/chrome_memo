/**
 * 后台服务脚本
 * 处理扩展的后台逻辑和与内容脚本的通信
 */

// 直接使用Chrome存储API
// 获取备忘录数据
async function getMemo(domain) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get('memos', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        const memos = result.memos || {};
        resolve(memos[domain] || null);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// 保存备忘录数据
async function saveMemo(domain, data) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get('memos', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        const memos = result.memos || {};
        memos[domain] = {
          ...data,
          updatedAt: new Date().toISOString()
        };
        
        chrome.storage.sync.set({ memos }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(memos[domain]);
          }
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

// 删除备忘录数据
async function deleteMemo(domain) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get('memos', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        const memos = result.memos || {};
        if (!memos[domain]) {
          resolve(false);
          return;
        }
        
        delete memos[domain];
        chrome.storage.sync.set({ memos }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

// 扩展安装或更新时的处理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装
    console.log('网站备忘录扩展已安装');
    
    // 可以在这里设置默认配置或显示欢迎页面
  } else if (details.reason === 'update') {
    // 扩展更新
    console.log(`网站备忘录扩展已更新到版本 ${chrome.runtime.getManifest().version}`);
    
    // 可以在这里处理版本迁移或显示更新说明
  }
});

// 处理快捷键命令
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    const activeTab = tabs[0];
    
    switch (command) {
      case 'toggle-memo':
        // 显示/隐藏备忘录
        chrome.tabs.sendMessage(activeTab.id, { action: 'toggleMemo' });
        break;
        
      case 'open-editor':
        // 打开编辑器
        chrome.tabs.sendMessage(activeTab.id, { action: 'openEditor' });
        break;
        
      case 'toggle-quick-add':
        // 开启/关闭选中文本添加功能
        chrome.tabs.sendMessage(activeTab.id, { action: 'toggleSelection' });
        break;
    }
  });
});

// 处理内容脚本和弹出窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理获取备忘录请求
  if (message.action === 'getMemo') {
    const { domain } = message;
    
    if (!domain) {
      sendResponse({ success: false, error: '域名不能为空' });
      return true;
    }

    // 查询存储中的备忘录
    try {
      getMemo(domain)
        .then(memo => {
          sendResponse({ success: true, memo });
        })
        .catch(error => {
          console.error('获取备忘录失败:', error);
          sendResponse({ success: false, error: error.message || '获取备忘录失败' });
        });
    } catch (error) {
      console.error('处理getMemo请求时发生错误:', error);
      sendResponse({ success: false, error: '处理请求时发生错误' });
    }
    
    return true; // 表示将异步发送响应
  }
  
  // 处理保存备忘录请求
  if (message.action === 'saveMemo') {
    const { domain, data } = message;
    
    if (!domain || !data) {
      sendResponse({ success: false, error: '域名或数据不能为空' });
      return true;
    }

    // 保存备忘录
    try {
      saveMemo(domain, data)
        .then(savedData => {
          sendResponse({ success: true, data: savedData });
        })
        .catch(error => {
          console.error('保存备忘录失败:', error);
          sendResponse({ success: false, error: error.message || '保存备忘录失败' });
        });
    } catch (error) {
      console.error('处理saveMemo请求时发生错误:', error);
      sendResponse({ success: false, error: '处理请求时发生错误' });
    }
    
    return true; // 表示将异步发送响应
  }
  
  // 处理删除备忘录请求
  if (message.action === 'deleteMemo') {
    const { domain } = message;
    
    if (!domain) {
      sendResponse({ success: false, error: '域名不能为空' });
      return true;
    }

    // 删除备忘录
    try {
      deleteMemo(domain)
        .then(result => {
          sendResponse({ success: result });
        })
        .catch(error => {
          console.error('删除备忘录失败:', error);
          sendResponse({ success: false, error: error.message || '删除备忘录失败' });
        });
    } catch (error) {
      console.error('处理deleteMemo请求时发生错误:', error);
      sendResponse({ success: false, error: '处理请求时发生错误' });
    }
    
    return true; // 表示将异步发送响应
  }
  
  // 处理设置上下文菜单
  if (message.action === 'setContextMenu') {
    // 暂不实现
    sendResponse({ success: true });
    return true;
  }
  
  // 处理导出数据请求
  if (message.action === 'exportData') {
    try {
      // 获取所有备忘录数据
      chrome.storage.sync.get('memos', (result) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        
        const memos = result.memos || {};
        
        // 创建导出数据对象
        const exportedData = {
          memos,
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
        };
        
        sendResponse({ success: true, data: exportedData });
      });
    } catch (error) {
      console.error('处理exportData请求时发生错误:', error);
      sendResponse({ success: false, error: '导出数据失败' });
    }
    
    return true; // 表示将异步发送响应
  }
  
  // 处理导入数据请求
  if (message.action === 'importData') {
    try {
      const { data } = message;
      
      if (!data || !data.memos) {
        sendResponse({ success: false, error: '无效的数据格式' });
        return true;
      }
      
      // 保存备忘录数据
      chrome.storage.sync.set({ memos: data.memos }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        
        sendResponse({ success: true });
      });
    } catch (error) {
      console.error('处理importData请求时发生错误:', error);
      sendResponse({ success: false, error: '导入数据失败' });
    }
    
    return true; // 表示将异步发送响应
  }

  // 如果没有匹配的action，返回未知操作错误
  sendResponse({ success: false, error: '未知操作' });
  return true;
});

// 创建上下文菜单（暂不实现）
function createContextMenus() {
  chrome.contextMenus.create({
    id: 'add-to-memo',
    title: '添加到备忘录',
    contexts: ['selection']
  });
}

// 处理上下文菜单点击事件（暂不实现）
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-to-memo') {
    const selectedText = info.selectionText;
    
    if (selectedText) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'addSelectionToMemo',
        text: selectedText
      });
    }
  }
}); 