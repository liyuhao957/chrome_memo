/**
 * 拖拽功能工具类
 * 用于使DOM元素可拖拽
 */

class DragUtils {
  /**
   * 使元素可拖拽
   * @param {HTMLElement} element - 要使其可拖拽的DOM元素
   * @param {HTMLElement} handle - 用于触发拖拽的把手元素，默认为元素本身
   * @param {Function} onDragEnd - 拖拽结束时的回调函数，接收最终位置
   * @returns {Object} - 包含清理函数的对象
   */
  makeDraggable(element, handle = element, onDragEnd = null) {
    if (!element || !handle) return { cleanup: () => {} };
    
    // 检查是否是Shadow DOM中的元素
    const isShadowElement = handle.getRootNode() instanceof ShadowRoot;
    
    // 存储拖拽相关状态
    let isDragging = false;
    let startX, startY;
    let elementX, elementY;
    
    // 获取元素当前位置
    const getElementPosition = () => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    };
    
    // 设置元素位置
    const setPosition = (x, y) => {
      // 应用边界限制
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rect = element.getBoundingClientRect();
      
      // 确保元素完全在视口内，不能被拖出页面
      // 限制x坐标，确保元素完全在视口内
      if (x < 0) {
        x = 0; // 左边界
      } else if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width; // 右边界
      }
      
      // 限制y坐标，确保元素完全在视口内
      if (y < 0) {
        y = 0; // 上边界
      } else if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height; // 下边界
      }
      
      // 设置位置
      element.style.position = 'fixed';
      element.style.left = x + 'px';
      element.style.top = y + 'px';
      element.style.right = '';
      element.style.bottom = '';
      
      // 恢复可能被覆盖的重要样式
      if (element.hasAttribute('data-chrome-memo')) {
        // 确保元素可见
        element.style.display = element.id.includes('floating') ? 'block' : 'block';
      }
      
      return { x, y };
    };
    
    // 设置为默认位置（右下角）
    const setDefaultPosition = () => {
      // 获取元素尺寸
      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 计算右下角位置，确保完全在视口内
      const rightPosition = Math.min(20, viewportWidth - rect.width);
      const bottomPosition = Math.min(20, viewportHeight - rect.height);
      
      // 使用CSS类定义的默认位置
      element.style.position = 'fixed';
      element.style.left = '';
      element.style.top = '';
      element.style.right = rightPosition + 'px';
      element.style.bottom = bottomPosition + 'px';
      
      return null;
    };
    
    // 开始拖拽
    const handleMouseDown = (e) => {
      // 如果点击在可编辑元素或按钮上，不启动拖拽
      if (e.target.isContentEditable || 
          e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.tagName === 'SELECT' || 
          e.target.tagName === 'BUTTON') {
        return;
      }
      
      // 阻止事件冒泡和默认行为
      e.preventDefault();
      e.stopPropagation();
      
      // 获取当前位置
      const position = getElementPosition();
      elementX = position.x;
      elementY = position.y;
      
      // 记录鼠标起始位置
      startX = e.clientX;
      startY = e.clientY;
      
      // 标记为拖动状态
      isDragging = true;
      
      // 添加事件监听
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    // 拖拽中
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      // 阻止事件冒泡和默认行为
      e.preventDefault();
      e.stopPropagation();
      
      // 计算新位置
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const newX = elementX + deltaX;
      const newY = elementY + deltaY;
      
      // 设置新位置
      setPosition(newX, newY);
    };
    
    // 结束拖拽
    const handleMouseUp = (e) => {
      if (!isDragging) return;
      
      // 阻止事件冒泡和默认行为
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // 标记为非拖动状态
      isDragging = false;
      
      // 获取最终位置
      const rect = element.getBoundingClientRect();
      const finalPosition = { x: rect.left, y: rect.top };
      
      // 移除事件监听
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // 调用拖拽结束回调
      if (onDragEnd && typeof onDragEnd === 'function') {
        onDragEnd(finalPosition);
      }
    };
    
    // 添加拖拽事件监听
    handle.addEventListener('mousedown', handleMouseDown);
    
    // 返回清理函数和位置设置函数
    return {
      cleanup: () => {
        handle.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      },
      setPosition: (position) => {
        if (position && typeof position.x === 'number' && typeof position.y === 'number') {
          return setPosition(position.x, position.y);
        } else {
          return setDefaultPosition();
        }
      }
    };
  }
  
  /**
   * 重置元素位置到默认位置
   * @param {HTMLElement} element - 要重置的DOM元素
   * @param {Object} defaultPosition - 默认位置 {x, y}
   * @param {Function} onPositionReset - 位置重置后的回调
   */
  resetPosition(element, defaultPosition = { x: 20, y: 20 }, onPositionReset = null) {
    if (!element) return;
    
    // 添加过渡动画
    element.classList.add('resetting-position');
    element.style.transform = `translate(${defaultPosition.x}px, ${defaultPosition.y}px)`;
    
    // 动画结束后移除过渡类
    const handleTransitionEnd = () => {
      element.classList.remove('resetting-position');
      element.removeEventListener('transitionend', handleTransitionEnd);
      
      // 调用回调
      if (onPositionReset && typeof onPositionReset === 'function') {
        onPositionReset(defaultPosition);
      }
    };
    
    element.addEventListener('transitionend', handleTransitionEnd);
  }
  
  /**
   * 使模板项可拖拽排序
   * @param {NodeList|Array} items - 要排序的元素列表
   * @param {Function} onOrderChange - 顺序改变时的回调函数
   */
  makeTemplatesSortable(items, onOrderChange) {
    if (!items || !items.length) return { cleanup: () => {} };
    
    let draggedItem = null;
    
    // 处理拖拽开始
    const handleDragStart = function(e) {
      draggedItem = this;
      this.classList.add('dragging');
      
      // 设置拖拽数据
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', this.innerHTML);
    };
    
    // 处理拖拽结束
    const handleDragEnd = function() {
      this.classList.remove('dragging');
      
      // 获取新顺序
      if (onOrderChange && typeof onOrderChange === 'function') {
        const newOrder = Array.from(items).map(item => item.dataset.name);
        onOrderChange(newOrder);
      }
    };
    
    // 处理拖拽经过
    const handleDragOver = function(e) {
      e.preventDefault();
      return false;
    };
    
    // 处理拖拽进入
    const handleDragEnter = function() {
      this.classList.add('over');
    };
    
    // 处理拖拽离开
    const handleDragLeave = function() {
      this.classList.remove('over');
    };
    
    // 处理放置
    const handleDrop = function(e) {
      e.stopPropagation();
      e.preventDefault();
      
      if (draggedItem !== this) {
        // 获取所有模板项
        const list = draggedItem.parentNode;
        const items = Array.from(list.children);
        
        // 获取两个元素的位置
        const draggedIndex = items.indexOf(draggedItem);
        const droppedIndex = items.indexOf(this);
        
        // 如果拖拽向下，插入到目标后面
        if (draggedIndex < droppedIndex) {
          this.parentNode.insertBefore(draggedItem, this.nextSibling);
        } else {
          // 如果拖拽向上，插入到目标前面
          this.parentNode.insertBefore(draggedItem, this);
        }
      }
      
      this.classList.remove('over');
      return false;
    };
    
    // 为每个模板项添加拖拽事件
    items.forEach(item => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragenter', handleDragEnter);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
    });
    
    // 返回清理函数
    return {
      cleanup: () => {
        items.forEach(item => {
          item.removeAttribute('draggable');
          item.removeEventListener('dragstart', handleDragStart);
          item.removeEventListener('dragend', handleDragEnd);
          item.removeEventListener('dragover', handleDragOver);
          item.removeEventListener('dragenter', handleDragEnter);
          item.removeEventListener('dragleave', handleDragLeave);
          item.removeEventListener('drop', handleDrop);
        });
      }
    };
  }
}

// 创建全局单例实例
window.dragUtils = new DragUtils(); 