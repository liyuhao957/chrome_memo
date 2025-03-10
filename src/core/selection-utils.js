/**
 * 文本选择工具类
 * 处理网页上的文本选择相关功能
 */

class SelectionUtils {
  constructor() {
    this.isSelectionFeatureEnabled = false;
    this.selectionPopup = null;
    
    // 绑定方法到实例，避免this指向问题
    this._handleSelection = this.handleSelection.bind(this);
    this._hideSelectionPopup = this.hideSelectionPopup.bind(this);
  }
  
  /**
   * 初始化文本选择处理
   * @param {Function} addToMemoCallback - 添加选中文本到备忘录的回调函数
   */
  initialize(addToMemoCallback) {
    console.log('初始化选中文本功能');
    
    // 先清理可能存在的旧实例
    this.destroy();
    
    this.addToMemoCallback = addToMemoCallback;
    this.createSelectionPopup();
    
    // 添加文本选择事件监听
    document.addEventListener('mouseup', this._handleSelection);
    document.addEventListener('mousedown', this._hideSelectionPopup);
    
    // 添加全局事件监听器，捕获阶段
    document.addEventListener('mouseup', (event) => {
      // 检查事件目标是否在备忘录内部
      const target = event.target;
      if (target) {
        let element = target;
        while (element) {
          if (element.classList && 
              (element.classList.contains('chrome-memo-container') || 
               element.hasAttribute && element.hasAttribute('data-chrome-memo'))) {
            // 设置全局标记
            window.lastSelectionFromMemo = true;
            console.log('捕获到备忘录内部的mouseup事件，设置全局标记');
            
            // 100毫秒后重置标记
            setTimeout(() => {
              window.lastSelectionFromMemo = false;
            }, 100);
            
            break;
          }
          element = element.parentNode;
          if (!element || element === document) break;
        }
      }
    }, true); // 使用捕获阶段
    
    // 从存储中恢复功能状态
    this.restoreFeatureState();
    
    return this;
  }
  
  /**
   * 从存储中恢复功能状态
   */
  restoreFeatureState() {
    try {
      chrome.storage.local.get('selectionFeatureEnabled', (result) => {
        if (result && result.selectionFeatureEnabled === true) {
          this.toggleSelectionFeature(true);
          console.log('从存储中恢复选中文本功能状态: 已启用');
        } else {
          console.log('从存储中恢复选中文本功能状态: 未启用');
        }
      });
    } catch (error) {
      console.error('恢复选中文本功能状态失败:', error);
    }
  }
  
  /**
   * 创建选中文本弹出框
   */
  createSelectionPopup() {
    // 移除可能存在的旧弹出框
    if (this.selectionPopup && this.selectionPopup.parentNode) {
      this.selectionPopup.parentNode.removeChild(this.selectionPopup);
    }
    
    this.selectionPopup = document.createElement('div');
    this.selectionPopup.className = 'chrome-memo-selection-popup';
    this.selectionPopup.style.display = 'none';
    this.selectionPopup.style.zIndex = '2147483647'; // 确保最高层级
    
    // 设置初始位置在屏幕外，避免闪烁
    this.selectionPopup.style.left = '-9999px';
    this.selectionPopup.style.top = '-9999px';
    
    const addButton = document.createElement('button');
    addButton.className = 'add-to-memo-btn';
    addButton.textContent = '添加到备忘录';
    
    // 直接绑定方法，避免使用箭头函数
    const self = this;
    addButton.onclick = function(event) {
      console.log('点击添加到备忘录按钮');
      event.preventDefault();
      event.stopPropagation();
      self.addSelectionToMemo();
    };
    
    this.selectionPopup.appendChild(addButton);
    document.body.appendChild(this.selectionPopup);
  }
  
  /**
   * 处理文本选择事件
   * @param {Event} event - 鼠标事件
   */
  handleSelection(event) {
    // 如果功能未启用，不处理
    if (!this.isSelectionFeatureEnabled) return;
    
    // 检查事件是否来自备忘录内部
    if (event && event.isFromMemo) {
      console.log('事件来自备忘录内部，不显示弹出框');
      this.hideSelectionPopup();
      return;
    }
    
    // 检查全局标记
    if (window.lastSelectionFromMemo) {
      console.log('检测到全局标记，选中文本来自备忘录，不显示弹出框');
      this.hideSelectionPopup();
      return;
    }
    
    // 延迟执行，确保选择已完成
    setTimeout(() => {
      try {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText) {
          console.log('检测到文本选择:', selectedText.substring(0, 20) + (selectedText.length > 20 ? '...' : ''));
          
          // 检查选中的文本是否在备忘录内部
          const isInMemo = this.isSelectionInsideMemo(selection);
          console.log('选中文本是否在备忘录内部:', isInMemo);
          
          if (isInMemo) {
            console.log('选中文本在备忘录内部，不显示弹出框');
            this.hideSelectionPopup(); // 确保弹出框被隐藏
            return;
          }
          
          // 获取选择的范围和位置
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          console.log('选中文本位置:', {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          });
          
          // 计算弹出框位置 - 直接定位在文本上方
          const popupX = rect.left + window.scrollX + (rect.width / 2);
          // 将弹出框定位在文本上方，加上一定的偏移量确保不遮挡文本
          const popupY = rect.top + window.scrollY - 30; // 增加偏移量，确保在文本上方
          
          // 显示弹出框在选择文本上方
          this.showSelectionPopup(popupX, popupY);
          
          // 防止点击事件隐藏弹出框
          if (event) event.stopPropagation();
        } else {
          this.hideSelectionPopup();
        }
      } catch (error) {
        console.error('处理文本选择时出错:', error);
      }
    }, 10);
  }
  
  /**
   * 检查选中的文本是否在备忘录内部
   * @param {Selection} selection - 当前选中的文本
   * @returns {boolean} - 如果选中的文本在备忘录内部，返回true
   */
  isSelectionInsideMemo(selection) {
    try {
      if (!selection || !selection.rangeCount) return false;
      
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      // 检查选中文本的容器元素或其父元素是否属于备忘录
      let element = container.nodeType === 3 ? container.parentNode : container;
      
      // 获取所有备忘录容器
      const memoContainers = document.querySelectorAll('.chrome-memo-container, [data-chrome-memo="true"]');
      console.log(`找到 ${memoContainers.length} 个备忘录容器`);
      
      // 检查是否在任何备忘录的Shadow DOM内部
      for (const memoContainer of memoContainers) {
        // 检查是否有shadowRoot
        if (memoContainer.shadowRoot) {
          // 尝试直接检查是否在shadowRoot内部
          if (this.isNodeInShadowRoot(element, memoContainer.shadowRoot)) {
            console.log('选中文本在备忘录的Shadow DOM内部');
            return true;
          }
        }
        
        // 检查是否是备忘录容器本身
        if (element === memoContainer) {
          console.log('选中文本在备忘录容器内部');
          return true;
        }
      }
      
      // 检查是否在备忘录组件内部（非Shadow DOM情况）
      while (element) {
        if (element.nodeType === 1) { // 元素节点
          // 检查元素是否有备忘录相关的类名或属性
          if (
            (element.classList && (
              element.classList.contains('chrome-memo-container') || 
              element.classList.contains('chrome-memo-content') ||
              element.classList.contains('chrome-memo-header')
            )) ||
            (element.hasAttribute && (
              element.hasAttribute('data-chrome-memo') ||
              element.hasAttribute('data-chrome-memo-content')
            ))
          ) {
            console.log('选中文本在备忘录元素内部');
            return true;
          }
        }
        
        // 向上遍历DOM树
        element = element.parentNode;
        
        // 如果到达文档根节点，结束循环
        if (!element || element === document) break;
      }
      
      // 如果上述检查都未发现在备忘录内部，再尝试一种方法
      // 检查选中文本的位置是否在任何备忘录元素的边界框内
      const selectionRect = range.getBoundingClientRect();
      
      for (const memoContainer of memoContainers) {
        const memoRect = memoContainer.getBoundingClientRect();
        
        // 检查选中区域是否与备忘录区域重叠
        if (
          selectionRect.left <= memoRect.right &&
          selectionRect.right >= memoRect.left &&
          selectionRect.top <= memoRect.bottom &&
          selectionRect.bottom >= memoRect.top
        ) {
          console.log('选中文本的位置与备忘录重叠');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('检查选中文本位置时出错:', error);
      return false;
    }
  }
  
  /**
   * 检查节点是否在指定的Shadow DOM内部
   * @param {Node} node - 要检查的节点
   * @param {ShadowRoot} shadowRoot - Shadow DOM根节点
   * @returns {boolean} - 如果节点在Shadow DOM内部，返回true
   */
  isNodeInShadowRoot(node, shadowRoot) {
    try {
      // 如果节点不存在或shadowRoot不存在，返回false
      if (!node || !shadowRoot) return false;
      
      // 检查节点是否在shadowRoot内部
      return shadowRoot.contains(node);
    } catch (error) {
      console.error('检查节点是否在Shadow DOM内部时出错:', error);
      return false;
    }
  }
  
  /**
   * 显示选择文本弹出框
   * @param {number} x - 水平位置
   * @param {number} y - 垂直位置
   */
  showSelectionPopup(x, y) {
    if (!this.selectionPopup) return;
    
    // 确保弹出框在视口内
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 120; // 估计宽度
    const popupHeight = 40; // 估计高度
    
    // 水平位置居中，由transform: translateX(-50%)处理
    let posX = Math.min(Math.max(x, popupWidth / 2), viewportWidth - popupWidth / 2);
    
    // 垂直位置，确保不超出视口顶部
    let posY = Math.max(y, 0);
    
    // 确保不超出视口底部
    if (posY + popupHeight > viewportHeight) {
      posY = viewportHeight - popupHeight;
    }
    
    // 先设置位置，再显示，避免闪烁
    this.selectionPopup.style.left = `${posX}px`;
    this.selectionPopup.style.top = `${posY}px`;
    
    // 确保元素已经隐藏，然后再显示，避免位置跳动
    this.selectionPopup.style.display = 'none';
    
    // 使用requestAnimationFrame确保在下一帧渲染时显示，避免闪烁
    requestAnimationFrame(() => {
      this.selectionPopup.style.display = 'block';
      console.log('显示选中文本弹出框，位置:', { x: posX, y: posY });
    });
  }
  
  /**
   * 隐藏选择文本弹出框
   */
  hideSelectionPopup(event) {
    if (!this.selectionPopup) return;
    
    // 如果点击的是弹出框内部元素，不隐藏
    if (event && event.target) {
      if (this.selectionPopup.contains(event.target) || 
          event.target.classList.contains('add-to-memo-btn')) {
        console.log('点击了弹出框内部元素，不隐藏弹出框');
        return;
      }
    }
    
    this.selectionPopup.style.display = 'none';
  }
  
  /**
   * 添加选中文本到备忘录
   */
  addSelectionToMemo() {
    try {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText && this.addToMemoCallback) {
        console.log('添加选中文本到备忘录:', selectedText.substring(0, 20) + (selectedText.length > 20 ? '...' : ''));
        
        // 确保回调函数存在并且是函数类型
        if (typeof this.addToMemoCallback !== 'function') {
          console.error('添加选中文本失败: 回调不是函数类型');
          this.showErrorToast('添加文本失败');
          return;
        }
        
        // 执行回调函数
        try {
          this.addToMemoCallback(selectedText);
          console.log('回调函数执行成功');
          this.showAddedToast();
        } catch (callbackError) {
          console.error('执行回调函数时出错:', callbackError);
          this.showErrorToast('添加文本失败');
        }
      } else {
        console.warn('无法添加选中文本: ' + (!selectedText ? '文本为空' : '回调未设置'));
        if (!selectedText) {
          this.showErrorToast('没有选中文本');
        } else {
          this.showErrorToast('添加功能未正确初始化');
        }
      }
      
      this.hideSelectionPopup();
    } catch (error) {
      console.error('添加选中文本时出错:', error);
      this.showErrorToast('添加文本失败');
    }
  }
  
  /**
   * 显示已添加提示
   */
  showAddedToast() {
    this.showToast('已添加到备忘录', 'success');
  }
  
  /**
   * 显示错误提示
   * @param {string} message - 错误消息
   */
  showErrorToast(message) {
    this.showToast(message, 'error');
  }
  
  /**
   * 显示提示消息
   * @param {string} message - 提示消息
   * @param {string} type - 提示类型 (success/error)
   */
  showToast(message, type = 'success') {
    let toast = document.querySelector('.chrome-memo-toast');
    
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'chrome-memo-toast';
      document.body.appendChild(toast);
    }
    
    // 设置类型样式
    toast.className = 'chrome-memo-toast';
    if (type === 'error') {
      toast.classList.add('error');
    } else {
      toast.classList.add('success');
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }
  
  /**
   * 启用/禁用选中文本添加功能
   * @param {boolean} enabled - 是否启用
   */
  toggleSelectionFeature(enabled) {
    this.isSelectionFeatureEnabled = enabled;
    console.log('选中文本功能状态已更改:', enabled ? '已启用' : '已禁用');
    
    // 保存状态到存储
    try {
      chrome.storage.local.set({ selectionFeatureEnabled: enabled });
    } catch (error) {
      console.error('保存选中文本功能状态失败:', error);
    }
    
    if (!enabled && this.selectionPopup) {
      this.hideSelectionPopup();
    }
  }
  
  /**
   * 清理资源，移除事件监听
   */
  destroy() {
    document.removeEventListener('mouseup', this._handleSelection);
    document.removeEventListener('mousedown', this._hideSelectionPopup);
    
    if (this.selectionPopup && this.selectionPopup.parentNode) {
      this.selectionPopup.parentNode.removeChild(this.selectionPopup);
      this.selectionPopup = null;
    }
  }
}

// 创建全局单例实例
window.selectionUtils = new SelectionUtils(); 