/**
 * 内容脚本
 * 在网页中运行，处理备忘录的显示和交互
 */

import { memoManager } from './core/memo-manager.js';
import { selectionUtils } from './core/selection-utils.js';
import { memoComponent } from './ui/components/memo.js';
import { editorComponent } from './ui/components/editor.js';

// 初始化
async function initializeMemo() {
  console.log('初始化网站备忘录...');
  
  // 初始化备忘录组件
  await memoComponent.initialize(openEditor);
  
  // 初始化编辑器组件
  editorComponent.initialize(
    // 保存回调
    async (content) => {
      await memoComponent.updateContent(content);
    },
    // 取消回调
    () => {
      console.log('编辑取消');
    }
  );
  
  // 初始化选中文本处理
  selectionUtils.initialize(async (selectedText) => {
    await memoManager.addSelectionToMemo(selectedText);
    await memoComponent.initialize(openEditor);
  });
  
  // 监听消息
  chrome.runtime.onMessage.addListener(handleMessages);
}

// 处理来自扩展或后台脚本的消息
function handleMessages(message, sender, sendResponse) {
  switch (message.action) {
    case 'toggleMemo':
      // 切换备忘录显示状态
      memoComponent.toggle();
      sendResponse({ success: true });
      break;
      
    case 'openEditor':
      // 打开编辑器
      const content = memoComponent.memoContent ? memoComponent.memoContent.innerHTML : '';
      openEditor(content);
      sendResponse({ success: true });
      break;
      
    case 'toggleSelection':
      // 切换选中文本添加功能
      const enabled = message.enabled !== undefined ? message.enabled : !selectionUtils.isSelectionFeatureEnabled;
      selectionUtils.toggleSelectionFeature(enabled);
      sendResponse({ success: true, enabled: selectionUtils.isSelectionFeatureEnabled });
      break;
      
    case 'getSelectionStatus':
      // 获取选中文本添加功能状态
      sendResponse({ success: true, enabled: selectionUtils.isSelectionFeatureEnabled });
      break;
      
    case 'addSelectionToMemo':
      // 添加选中文本到备忘录
      if (message.text) {
        memoManager.addSelectionToMemo(message.text)
          .then(() => {
            // 重新初始化备忘录以更新内容
            return memoComponent.initialize(openEditor);
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
  
  return true; // 保持消息通道开放，允许异步响应
}

// 打开编辑器
function openEditor(initialContent = '') {
  editorComponent.open(initialContent);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeMemo);

// 如果文档已经加载完成，直接初始化
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initializeMemo();
} 