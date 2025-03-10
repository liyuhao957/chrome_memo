/**
 * 备忘录组件类
 * 负责备忘录UI的创建和管理
 */

class MemoComponent {
  constructor() {
    this.memoContainer = null;
    this.memoContent = null;
    this.isVisible = false;
    this.dragHelper = null;
    this.isMinimized = false;
    this.floatingIcon = null;
    this.visibilityObserver = null;
  }
  
  /**
   * 初始化备忘录组件
   * @param {Function} onEditClick - 编辑按钮点击回调
   */
  async initialize(onEditClick) {
    this.onEditClick = onEditClick;
    
    // 加载当前网站的备忘录数据
    const memo = await window.memoManager.loadCurrentMemo();
    
    // 创建备忘录UI
    this.createMemoUI(memo);
    
    // 如果有数据且设置为可见，则显示备忘录
    if (memo && memo.isVisible) {
      this.show();
    }
    
    // 添加可见性监视器，确保备忘录不会意外消失
    this.setupVisibilityObserver();
    
    return this;
  }
  
  /**
   * 设置可见性监视器，确保备忘录不会意外消失
   */
  setupVisibilityObserver() {
    if (!this.memoContainer) return;
    
    // 如果已有监视器，先断开连接
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
    }
    
    // 创建一个MutationObserver来监视备忘录元素的属性变化
    this.visibilityObserver = new MutationObserver((mutations) => {
      // 只在备忘录应该可见时进行检查
      if (!this.isVisible || this.isMinimized) return;
      
      // 检查是否有影响可见性的变化
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'style' && 
            this.memoContainer.style.display === 'none') {
          
          console.log('Detected memo visibility issue, fixing...');
          // 恢复显示
          this.memoContainer.style.display = 'block';
          break;
        }
      }
    });
    
    // 开始监视备忘录元素的属性变化
    this.visibilityObserver.observe(this.memoContainer, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
  
  /**
   * 创建备忘录UI元素
   * @param {Object} memoData - 备忘录数据
   */
  createMemoUI(memoData) {
    // 如果已经存在，先移除
    if (this.memoContainer) {
      document.body.removeChild(this.memoContainer);
    }
    
    // 创建备忘录容器
    this.memoContainer = document.createElement('div');
    this.memoContainer.id = 'chrome-memo-container-' + Date.now();
    this.memoContainer.setAttribute('data-chrome-memo', 'true');
    
    // 设置容器样式
    Object.assign(this.memoContainer.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '2147483647',
      display: 'block'
    });
    
    // 创建Shadow DOM
    const shadowRoot = this.memoContainer.attachShadow({ mode: 'closed' });
    
    // 创建样式
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        display: block;
      }
      
      .memo-container {
        width: 300px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
        overflow: hidden;
        transition: box-shadow 0.3s ease;
      }
      
      .memo-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background-color: #7c4dff;
        color: white;
        cursor: move;
        user-select: none;
      }
      
      .site-indicator {
        font-size: 12px;
        max-width: 180px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .site-indicator strong {
        font-weight: 500;
      }
      
      .header-actions {
        display: flex;
        gap: 8px;
      }
      
      .header-button {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        padding: 2px;
      }
      
      .memo-content {
        padding: 10px;
        max-height: 300px;
        overflow-y: auto;
        background-color: #fff;
        font-size: 14px;
        line-height: 1.5;
      }
    `;
    
    // 创建备忘录内部容器
    const memoInner = document.createElement('div');
    memoInner.className = 'memo-container';
    
    // 创建备忘录头部
    const header = document.createElement('div');
    header.className = 'memo-header';
    
    // 网站指示器
    const siteIndicator = document.createElement('div');
    siteIndicator.className = 'site-indicator';
    siteIndicator.innerHTML = `<strong>${window.location.hostname}</strong>`;
    
    // 头部操作区
    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    
    // 编辑按钮
    const editButton = document.createElement('button');
    editButton.className = 'header-button edit-button';
    editButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    editButton.title = '编辑备忘录';
    
    // 重置位置按钮
    const resetPositionButton = document.createElement('button');
    resetPositionButton.className = 'header-button reset-button';
    resetPositionButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="9" x2="15" y2="15"></line>
        <line x1="15" y1="9" x2="9" y2="15"></line>
      </svg>
    `;
    resetPositionButton.title = '重置位置';
    
    // 最小化按钮
    const minimizeButton = document.createElement('button');
    minimizeButton.className = 'header-button minimize-button';
    minimizeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    `;
    minimizeButton.title = '最小化';
    
    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'header-button close-button';
    closeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeButton.title = '关闭';
    
    // 创建备忘录内容区
    const content = document.createElement('div');
    content.className = 'memo-content';
    content.innerHTML = memoData && memoData.content ? memoData.content : '';
    
    // 保存内容元素的引用
    this.memoContent = content;
    
    // 添加按钮到头部操作区
    headerActions.appendChild(editButton);
    headerActions.appendChild(resetPositionButton);
    headerActions.appendChild(minimizeButton);
    headerActions.appendChild(closeButton);
    
    // 将网站指示器和头部操作区添加到头部
    header.appendChild(siteIndicator);
    header.appendChild(headerActions);
    
    // 将头部和内容区添加到备忘录内部容器
    memoInner.appendChild(header);
    memoInner.appendChild(content);
    
    // 将样式和内部容器添加到Shadow DOM
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(memoInner);
    
    // 添加到文档
    document.body.appendChild(this.memoContainer);
    
    // 添加事件监听器
    editButton.addEventListener('click', () => {
      if (this.onEditClick) {
        this.onEditClick(this.memoContent.innerHTML);
      }
    });
    
    resetPositionButton.addEventListener('click', () => {
      this.resetPosition();
    });
    
    minimizeButton.addEventListener('click', () => {
      this.minimize();
    });
    
    closeButton.addEventListener('click', () => {
      this.hide();
    });
    
    // 使备忘录可拖拽
    this.makeDraggable(header, memoData ? memoData.position : null);
    
    // 创建悬浮图标
    this.createFloatingIcon();
  }
  
  /**
   * 创建悬浮图标
   */
  createFloatingIcon() {
    if (this.floatingIcon) {
      document.body.removeChild(this.floatingIcon);
    }
    
    this.floatingIcon = document.createElement('div');
    this.floatingIcon.id = 'chrome-memo-floating-icon-' + Date.now();
    this.floatingIcon.setAttribute('data-chrome-memo', 'true');
    
    // 设置容器样式
    Object.assign(this.floatingIcon.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: '2147483647',
      display: 'none'
    });
    
    // 创建Shadow DOM
    const shadowRoot = this.floatingIcon.attachShadow({ mode: 'closed' });
    
    // 创建样式
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        display: block;
      }
      
      .floating-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #7c4dff;
        box-shadow: 0 2px 10px rgba(124, 77, 255, 0.3);
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        cursor: pointer;
        user-select: none;
        font-weight: bold;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .floating-icon:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(124, 77, 255, 0.4);
      }
      
      .icon-inner {
        font-size: 18px;
        font-weight: bold;
      }
      
      .icon-tooltip {
        position: absolute;
        right: 48px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transform: translateX(10px);
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: none;
      }
      
      .floating-icon:hover .icon-tooltip {
        opacity: 1;
        transform: translateX(0);
      }
    `;
    
    // 创建图标内部容器
    const iconInner = document.createElement('div');
    iconInner.className = 'floating-icon';
    
    // 创建图标内容
    const iconContent = document.createElement('div');
    iconContent.className = 'icon-inner';
    iconContent.textContent = 'M';
    
    // 创建提示文本
    const tooltip = document.createElement('div');
    tooltip.className = 'icon-tooltip';
    tooltip.textContent = '打开备忘录';
    
    // 组装图标
    iconInner.appendChild(iconContent);
    iconInner.appendChild(tooltip);
    
    // 将样式和内部容器添加到Shadow DOM
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(iconInner);
    
    // 添加点击事件
    iconInner.addEventListener('click', () => {
      this.restore();
    });
    
    // 添加到文档
    document.body.appendChild(this.floatingIcon);
    
    // 使悬浮图标可拖拽
    this.floatingIconDragHelper = window.dragUtils.makeDraggable(
      this.floatingIcon,
      iconInner,
      async (position) => {
        // 保存悬浮图标位置
        await window.memoManager.updateFloatingIconPosition(position);
      }
    );
  }
  
  /**
   * 显示备忘录
   */
  async show() {
    if (!this.memoContainer) return;
    
    // 显示备忘录
    this.memoContainer.style.display = 'block';
    this.isVisible = true;
    this.isMinimized = false;
    this.floatingIcon.style.display = 'none';
    
    // 检查备忘录是否在视口内，如果不在则重置位置
    const rect = this.memoContainer.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 防止除以零错误
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Memo has zero width or height, skipping visibility check');
      // 如果尺寸为0，可能是样式问题，尝试重置位置
      this.resetPosition();
    } else {
      // 计算可见部分的比例
      const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
      const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      const visibleWidthRatio = visibleWidth / rect.width;
      const visibleHeightRatio = visibleHeight / rect.height;
      
      // 只有在备忘录几乎完全不可见时才重置位置
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewportWidth || rect.top >= viewportHeight ||
          (visibleWidthRatio < 0.1 && visibleHeightRatio < 0.1)) {
        this.resetPosition();
      }
    }
    
    // 更新存储中的可见状态
    await window.memoManager.setMemoVisibility(true);
  }
  
  /**
   * 隐藏备忘录
   */
  async hide() {
    if (!this.memoContainer) return;
    
    this.memoContainer.style.display = 'none';
    this.floatingIcon.style.display = 'none';
    this.isVisible = false;
    this.isMinimized = false;
    
    // 更新存储中的可见状态
    await window.memoManager.setMemoVisibility(false);
  }
  
  /**
   * 最小化备忘录
   */
  minimize() {
    if (!this.memoContainer) return;
    
    this.memoContainer.style.display = 'none';
    this.floatingIcon.style.display = 'flex';
    this.isMinimized = true;
    this.isVisible = true;
    
    // 恢复悬浮图标位置
    if (this.floatingIconDragHelper) {
      this.floatingIconDragHelper.setPosition(null);
    }
  }
  
  /**
   * 从最小化状态恢复
   */
  restore() {
    if (!this.memoContainer || !this.isMinimized) return;
    
    // 显示备忘录
    this.memoContainer.style.display = 'block';
    this.floatingIcon.style.display = 'none';
    this.isMinimized = false;
    
    // 检查备忘录是否在视口内，如果不在则重置位置
    const rect = this.memoContainer.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 防止除以零错误
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Memo has zero width or height, skipping visibility check');
      // 如果尺寸为0，可能是样式问题，尝试重置位置
      this.resetPosition();
    } else {
      // 计算可见部分的比例
      const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
      const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      const visibleWidthRatio = visibleWidth / rect.width;
      const visibleHeightRatio = visibleHeight / rect.height;
      
      // 只有在备忘录几乎完全不可见时才重置位置
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewportWidth || rect.top >= viewportHeight ||
          (visibleWidthRatio < 0.1 && visibleHeightRatio < 0.1)) {
        this.resetPosition();
      }
    }
  }
  
  /**
   * 切换备忘录显示状态
   */
  async toggle() {
    if (this.isVisible) {
      if (this.isMinimized) {
        this.restore();
      } else {
        this.hide();
      }
    } else {
      this.show();
    }
  }
  
  /**
   * 使备忘录可拖拽
   * @param {HTMLElement} handle - 拖拽把手
   * @param {Object} initialPosition - 初始位置
   */
  makeDraggable(handle, initialPosition) {
    // 如果已有拖拽实例，先清理
    if (this.dragHelper) {
      this.dragHelper.cleanup();
    }
    
    // 创建新的拖拽实例
    this.dragHelper = window.dragUtils.makeDraggable(
      this.memoContainer,
      handle,
      async (position) => {
        try {
          // 保存新位置到存储
          await window.memoManager.updateMemoPosition(position);
        } catch (error) {
          console.error('Error in drag end callback:', error);
        }
      }
    );
    
    // 设置初始位置
    this.dragHelper.setPosition(initialPosition);
    
    // 添加窗口大小变化监听，确保备忘录始终可见
    const handleResize = () => {
      // 如果备忘录不可见或已最小化，不处理
      if (!this.isVisible || this.isMinimized) return;
      
      // 获取备忘录位置
      const rect = this.memoContainer.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 防止除以零错误
      if (rect.width === 0 || rect.height === 0) {
        console.warn('Memo has zero width or height, skipping visibility check');
        return;
      }
      
      // 计算可见部分的比例
      const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
      const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      const visibleWidthRatio = visibleWidth / rect.width;
      const visibleHeightRatio = visibleHeight / rect.height;
      
      // 只有在备忘录几乎完全不可见时才重置位置
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewportWidth || rect.top >= viewportHeight ||
          (visibleWidthRatio < 0.1 && visibleHeightRatio < 0.1)) {
        this.resetPosition();
      }
    };
    
    // 添加窗口大小变化监听
    window.addEventListener('resize', handleResize);
    
    // 保存清理函数
    const originalCleanup = this.dragHelper.cleanup;
    this.dragHelper.cleanup = () => {
      originalCleanup();
      window.removeEventListener('resize', handleResize);
    };
  }
  
  /**
   * 重置备忘录位置
   */
  async resetPosition() {
    if (this.memoContainer && this.dragHelper) {
      try {
        // 使用dragHelper的setPosition方法，传入null表示使用CSS定位
        this.dragHelper.setPosition(null);
        
        // 保存位置为null，表示使用CSS默认位置
        await window.memoManager.updateMemoPosition(null);
      } catch (error) {
        console.error('Error in resetPosition:', error);
      }
    }
  }
  
  /**
   * 更新备忘录内容
   * @param {string} content - 新的备忘录内容
   */
  async updateContent(content) {
    if (!this.memoContent) return;
    
    this.memoContent.innerHTML = content;
    
    // 保存更新后的内容
    await window.memoManager.saveMemo(content);
  }
}

// 创建全局单例实例
window.memoComponent = new MemoComponent(); 