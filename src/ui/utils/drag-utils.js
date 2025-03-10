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
    
    // 存储拖拽相关状态
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    // 边界限制，确保元素不会被拖出视口
    const checkBoundaries = (x, y) => {
      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 确保至少20px位于视口内
      const minVisibleWidth = Math.min(rect.width, 20);
      const minVisibleHeight = Math.min(rect.height, 20);
      
      // 限制x坐标
      if (x < -rect.width + minVisibleWidth) {
        x = -rect.width + minVisibleWidth;
      } else if (x > viewportWidth - minVisibleWidth) {
        x = viewportWidth - minVisibleWidth;
      }
      
      // 限制y坐标
      if (y < 0) {
        y = 0;
      } else if (y > viewportHeight - minVisibleHeight) {
        y = viewportHeight - minVisibleHeight;
      }
      
      return { x, y };
    };
    
    // 设置元素位置
    const setTranslate = (x, y) => {
      const { x: boundedX, y: boundedY } = checkBoundaries(x, y);
      element.style.transform = `translate(${boundedX}px, ${boundedY}px)`;
      
      // 更新当前位置
      xOffset = boundedX;
      yOffset = boundedY;
    };
    
    // 开始拖拽
    const handleMouseDown = (e) => {
      // 如果点击在可编辑元素上，不启动拖拽
      if (e.target.isContentEditable || 
          e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.tagName === 'SELECT' || 
          e.target.tagName === 'BUTTON') {
        return;
      }
      
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      
      isDragging = true;
      element.classList.add('dragging');
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    // 拖拽中
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      setTranslate(currentX, currentY);
    };
    
    // 结束拖拽
    const handleMouseUp = () => {
      if (!isDragging) return;
      
      isDragging = false;
      element.classList.remove('dragging');
      
      // 调用拖拽结束回调
      if (onDragEnd && typeof onDragEnd === 'function') {
        onDragEnd({ x: xOffset, y: yOffset });
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // 添加拖拽事件监听
    handle.addEventListener('mousedown', handleMouseDown);
    
    // 返回清理函数
    return {
      cleanup: () => {
        handle.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      },
      setPosition: (position) => {
        if (position && typeof position.x === 'number' && typeof position.y === 'number') {
          xOffset = position.x;
          yOffset = position.y;
          setTranslate(position.x, position.y);
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