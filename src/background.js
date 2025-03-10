/**
 * 后台服务脚本
 * 处理扩展的后台逻辑和与内容脚本的通信
 */

// 动态确定如何访问storageManager
let storageManager;

// 首先尝试直接从全局变量获取
if (typeof window !== 'undefined' && window.storageManager) {
  storageManager = window.storageManager;
} else {
  // 否则尝试导入模块
  try {
    import('./data/storage.js').then(module => {
      storageManager = module.storageManager;
      console.log('StorageManager模块已成功导入');
    }).catch(err => {
      console.error('导入StorageManager模块失败:', err);
    });
  } catch (error) {
    console.error('无法导入StorageManager:', error);
  }
}

// 扩展安装或更新时的处理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装
    console.log('网站备忘录扩展已安装');
    
    // 可以在这里设置默认配置或显示欢迎页面
    // 打开欢迎页面或说明
    chrome.tabs.create({
      url: chrome.runtime.getURL('templates.html')
    });
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

    // 确保storageManager已初始化
    if (!storageManager) {
      console.error('StorageManager未初始化');
      sendResponse({ 
        success: false, 
        error: 'StorageManager未初始化'
      });
      return true;
    }
    
    // 查询存储中的备忘录
    try {
      storageManager.getMemo(domain)
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

    // 确保storageManager已初始化
    if (!storageManager) {
      console.error('StorageManager未初始化');
      sendResponse({ 
        success: false, 
        error: 'StorageManager未初始化'
      });
      return true;
    }
    
    // 保存备忘录
    try {
      storageManager.saveMemo(domain, data)
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

    // 确保storageManager已初始化
    if (!storageManager) {
      console.error('StorageManager未初始化');
      sendResponse({ 
        success: false, 
        error: 'StorageManager未初始化'
      });
      return true;
    }
    
    // 删除备忘录
    try {
      storageManager.deleteMemo(domain)
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