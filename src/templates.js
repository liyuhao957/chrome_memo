/**
 * 模板管理页面JavaScript
 * 处理模板管理页面的操作逻辑
 */

import { templateManager } from './core/template-manager.js';
import { templateListComponent } from './ui/components/template-list.js';

document.addEventListener('DOMContentLoaded', function() {
  const container = document.body;
  
  // 初始化模板列表组件
  templateListComponent.initialize(container, useTemplate);
  
  /**
   * 使用模板回调
   * @param {string} name - 模板名称
   * @param {string} content - 模板内容
   */
  function useTemplate(name, content) {
    // 创建临时输入框，方便用户复制内容
    const input = document.createElement('textarea');
    input.value = content;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    
    // 显示提示
    showToast(`模板"${name}"已复制到剪贴板`);
  }
  
  /**
   * 显示提示消息
   * @param {string} message - 提示消息
   * @param {string} type - 提示类型 success/error
   */
  function showToast(message, type = 'success') {
    let toast = document.querySelector('.toast');
    
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // 显示提示
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 3秒后隐藏
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
});