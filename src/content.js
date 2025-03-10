/**
 * 内容脚本
 * 在网页中运行，处理备忘录的显示和交互
 */

// 初始化
async function initializeMemo() {
  console.log('初始化网站备忘录...');
  
  try {
    // 检查storageManager是否加载
    if (!window.storageManager) {
      console.error('StorageManager未初始化，无法加载备忘录状态');
      return;
    }
    
    // 初始化备忘录组件
    if (!window.memoComponent) {
      console.error('MemoComponent未初始化');
      return;
    }
    
    await window.memoComponent.initialize(openEditor);
    
    // 初始化编辑器组件
    if (!window.editorComponent) {
      console.error('EditorComponent未初始化');
      return;
    }
    
    window.editorComponent.initialize(
      // 保存回调
      async (content) => {
        await window.memoComponent.updateContent(content);
      },
      // 取消回调
      () => {
        console.log('编辑取消');
      }
    );
    
    // 确保编辑器不会自动打开
    if (window.editorComponent.isOpen) {
      window.editorComponent.close();
    }
    
    // 初始化选中文本处理
    if (!window.selectionUtils) {
      console.error('SelectionUtils未初始化');
      return;
    }
    
    window.selectionUtils.initialize(async (selectedText) => {
      await window.memoManager.addSelectionToMemo(selectedText);
      await window.memoComponent.initialize(openEditor);
    });
    
    // 监听消息
    chrome.runtime.onMessage.addListener(handleMessages);
    
    console.log('网站备忘录初始化完成');
  } catch (error) {
    console.error('初始化备忘录时发生错误:', error);
  }
}

// 处理来自扩展或后台脚本的消息
function handleMessages(message, sender, sendResponse) {
  try {
    switch (message.action) {
      case 'toggleMemo':
        // 切换备忘录显示状态
        window.memoComponent.toggle();
        sendResponse({ success: true });
        break;
        
      case 'openEditor':
        // 打开编辑器
        const content = window.memoComponent.memoContent ? window.memoComponent.memoContent.innerHTML : '';
        openEditor(content);
        sendResponse({ success: true });
        break;
        
      case 'toggleSelection':
        // 切换选中文本添加功能
        const enabled = message.enabled !== undefined ? message.enabled : !window.selectionUtils.isSelectionFeatureEnabled;
        window.selectionUtils.toggleSelectionFeature(enabled);
        sendResponse({ success: true, enabled: window.selectionUtils.isSelectionFeatureEnabled });
        break;
        
      case 'getSelectionStatus':
        // 获取选中文本添加功能状态
        sendResponse({ 
          success: true, 
          enabled: window.selectionUtils.isSelectionFeatureEnabled
        });
        break;
        
      case 'addSelectionToMemo':
        // 添加选中文本到备忘录
        if (message.text) {
          window.memoManager.addSelectionToMemo(message.text)
            .then(() => {
              // 重新初始化备忘录以更新内容
              return window.memoComponent.initialize(openEditor);
            })
            .then(() => {
              sendResponse({ success: true });
            })
            .catch(error => {
              console.error('添加选中文本失败:', error);
              sendResponse({ success: false, error: error.message });
            });
          return true; // 异步响应
        }
        break;
        
      default:
        // 未知操作
        sendResponse({ success: false, error: '未知操作' });
    }
  } catch (error) {
    console.error('处理消息时发生错误:', error);
    sendResponse({ success: false, error: '处理消息时发生错误' });
  }
  
  return true; // 保持消息通道开放，允许异步响应
}

// 打开编辑器
function openEditor(initialContent = '') {
  if (!window.editorComponent) {
    console.error('打开编辑器失败: EditorComponent未初始化');
    return;
  }
  
  window.editorComponent.open(initialContent);
}

// 确保所有脚本都加载完成
function waitForScriptsToLoad() {
  if (window.storageManager && 
      window.memoManager && 
      window.selectionUtils && 
      window.dragUtils && 
      window.memoComponent && 
      window.editorComponent) {
    
    console.log('所有组件已加载完成，初始化备忘录...');
    initializeMemo();
  } else {
    console.log('等待脚本加载...');
    setTimeout(waitForScriptsToLoad, 100);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded，开始等待脚本加载...');
  waitForScriptsToLoad();
});

// 如果文档已经加载完成，直接初始化
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('文档已加载，开始等待脚本加载...');
  waitForScriptsToLoad();
} 