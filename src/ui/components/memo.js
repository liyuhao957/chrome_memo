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
    
    try {
      // 加载备忘录数据
      const memoData = await window.memoManager.loadCurrentMemo();
      
      // 创建备忘录UI
      this.createMemoUI(memoData);
      
      // 创建悬浮图标
      await this.createFloatingIcon();
      
      // 设置可见性观察器
      this.setupVisibilityObserver();
      
      // 如果有保存的可见状态，恢复它
      if (memoData && memoData.isVisible) {
        this.show();
      } else {
        this.hide();
      }
      
      return this;
    } catch (error) {
      console.error('初始化备忘录组件失败:', error);
      throw error;
    }
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
        padding: 14px 18px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        cursor: move;
        user-select: none;
        position: relative;
        overflow: hidden;
      }
      
      .memo-header::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: rgba(255, 255, 255, 0.3);
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
        gap: 4px;
      }
      
      .header-button {
        background: none;
        border: none;
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: background-color 0.2s;
      }
      
      .header-button:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      .memo-content {
        padding: 12px;
        min-height: 40px;
        max-height: 300px;
        overflow-y: auto;
        color: #333;
        font-size: 14px;
        line-height: 1.6;
      }
      
      .memo-content::-webkit-scrollbar {
        width: 6px;
      }
      
      .memo-content::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      
      .memo-content::-webkit-scrollbar-thumb {
        background: #ddd;
        border-radius: 3px;
      }
      
      .memo-content::-webkit-scrollbar-thumb:hover {
        background: #ccc;
      }
      
      .copy-success {
        position: absolute;
        bottom: 15px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        opacity: 0;
        transition: opacity 0.3s, transform 0.3s;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 2147483647;
      }
      
      .copy-success.show {
        opacity: 1;
        transform: translateX(-50%) translateY(-5px);
      }
      
      /* 快捷键提示框样式 */
      .shortcut-tooltip-container {
        position: relative;
        z-index: 2147483647;
        pointer-events: none;
      }
      
      .shortcut-tooltip {
        position: absolute;
        width: 280px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 2147483647;
        overflow: hidden;
        animation: fadeIn 0.3s ease;
        border: 1px solid rgba(0, 0, 0, 0.05);
        pointer-events: auto;
      }
      
      /* 特殊样式：快捷键按钮 */
      .shortcut-button {
        background-color: rgba(255, 255, 255, 0.2) !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 4px !important;
      }
      
      .shortcut-button:hover {
        background-color: rgba(255, 255, 255, 0.3) !important;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .shortcut-tooltip-header {
        padding: 12px 16px;
        background: linear-gradient(135deg, #6e8efb, #7c4dff);
        color: white;
        font-weight: 600;
        font-size: 15px;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        text-align: center;
        letter-spacing: 0.5px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
      
      .shortcut-tooltip-content {
        padding: 16px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .shortcut-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .shortcut-item:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }
      
      .shortcut-key {
        background-color: #f5f5f5;
        padding: 6px 10px;
        border-radius: 6px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 13px;
        color: #333;
        border: 1px solid #e0e0e0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        font-weight: 500;
        min-width: 80px;
        text-align: center;
      }
      
      .shortcut-desc {
        color: #444;
        font-size: 14px;
        flex: 1;
        margin-left: 12px;
        line-height: 1.4;
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
    
    // 快捷键按钮
    const shortcutButton = document.createElement('button');
    shortcutButton.className = 'header-button shortcut-button';
    shortcutButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    `;
    shortcutButton.title = '查看快捷键';
    shortcutButton.style.width = '24px';
    shortcutButton.style.height = '24px';
    shortcutButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    shortcutButton.style.borderRadius = '4px';
    shortcutButton.style.cursor = 'pointer';
    shortcutButton.style.display = 'flex';
    shortcutButton.style.alignItems = 'center';
    shortcutButton.style.justifyContent = 'center';
    
    // 复制按钮
    const copyButton = document.createElement('button');
    copyButton.className = 'header-button copy-button';
    copyButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    copyButton.title = '复制内容';
    
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
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
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
    
    // 创建复制成功提示
    const copySuccess = document.createElement('div');
    copySuccess.className = 'copy-success';
    copySuccess.textContent = '复制成功！';
    
    // 创建快捷键提示框
    const shortcutTooltip = document.createElement('div');
    shortcutTooltip.className = 'shortcut-tooltip';
    shortcutTooltip.innerHTML = `
      <div class="shortcut-tooltip-header">快捷键</div>
      <div class="shortcut-tooltip-content">
        <div class="shortcut-item">
          <span class="shortcut-key">${navigator.platform.indexOf('Mac') > -1 ? 'Option+M' : 'Alt+M'}</span>
          <span class="shortcut-desc">显示/隐藏备忘录</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-key">${navigator.platform.indexOf('Mac') > -1 ? 'Option+E' : 'Alt+E'}</span>
          <span class="shortcut-desc">打开备忘录编辑器</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-key">${navigator.platform.indexOf('Mac') > -1 ? 'Option+Q' : 'Alt+Q'}</span>
          <span class="shortcut-desc">开启/关闭选中文本添加</span>
        </div>
      </div>
    `;
    shortcutTooltip.style.display = 'none';
    
    // 保存内容元素的引用
    this.memoContent = content;
    
    // 添加按钮到头部操作区
    headerActions.appendChild(shortcutButton);
    headerActions.appendChild(copyButton);
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
    memoInner.appendChild(copySuccess);
    
    // 创建快捷键提示框容器
    const shortcutTooltipContainer = document.createElement('div');
    shortcutTooltipContainer.className = 'shortcut-tooltip-container';
    shortcutTooltipContainer.style.position = 'absolute';
    shortcutTooltipContainer.style.top = '0';
    shortcutTooltipContainer.style.left = '0';
    shortcutTooltipContainer.style.width = '100%';
    shortcutTooltipContainer.style.height = '100%';
    shortcutTooltipContainer.style.pointerEvents = 'none'; // 避免阻挡其他元素的点击
    shortcutTooltipContainer.appendChild(shortcutTooltip);
    
    // 确保提示框可以接收点击事件
    shortcutTooltip.style.pointerEvents = 'auto';
    
    memoInner.appendChild(shortcutTooltipContainer);
    
    // 将样式和内部容器添加到Shadow DOM
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(memoInner);
    
    // 添加到文档
    document.body.appendChild(this.memoContainer);
    
    // 添加事件监听器
    shortcutButton.addEventListener('click', (event) => {
      // 阻止事件冒泡，避免触发其他点击事件
      event.stopPropagation();
      
      console.log('快捷键按钮被点击'); // 添加调试日志
      
      // 切换快捷键提示框的显示状态
      const isHidden = shortcutTooltip.style.display === 'none' || !shortcutTooltip.style.display;
      
      if (isHidden) {
        // 显示提示框
        shortcutTooltip.style.display = 'block';
        
        // 定位提示框 - 默认显示在备忘录的右侧
        shortcutTooltip.style.top = '0';
        shortcutTooltip.style.left = '100%';
        shortcutTooltip.style.right = 'auto';
        shortcutTooltip.style.marginLeft = '10px';
        
        // 获取提示框的位置和尺寸
        setTimeout(() => {
          try {
            const tooltipRect = shortcutTooltip.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // 检查右侧是否有足够空间
            if (tooltipRect.right > viewportWidth) {
              // 如果右侧空间不足，显示在左侧
              shortcutTooltip.style.left = 'auto';
              shortcutTooltip.style.right = '100%';
              shortcutTooltip.style.marginLeft = '0';
              shortcutTooltip.style.marginRight = '10px';
            }
            
            // 检查底部是否有足够空间
            if (tooltipRect.bottom > viewportHeight) {
              // 如果底部空间不足，向上调整
              const overflowY = tooltipRect.bottom - viewportHeight;
              shortcutTooltip.style.top = `-${overflowY}px`;
            }
          } catch (error) {
            console.error('调整快捷键提示框位置时出错:', error);
          }
        }, 10);
        
        // 点击其他区域关闭提示框
        const closeTooltipOnClickOutside = (e) => {
          // 检查点击的元素是否在Shadow DOM内
          const path = e.composedPath ? e.composedPath() : e.path;
          const isOutside = !path.includes(shortcutTooltip) && !path.includes(shortcutButton);
          
          if (isOutside) {
            shortcutTooltip.style.display = 'none';
            document.removeEventListener('click', closeTooltipOnClickOutside);
          }
        };
        
        // 延迟添加事件监听器，避免立即触发
        setTimeout(() => {
          document.addEventListener('click', closeTooltipOnClickOutside);
        }, 100);
        
        // 10秒后自动隐藏
        setTimeout(() => {
          if (shortcutTooltip.style.display === 'block') {
            shortcutTooltip.style.display = 'none';
            document.removeEventListener('click', closeTooltipOnClickOutside);
          }
        }, 10000);
      } else {
        shortcutTooltip.style.display = 'none';
      }
    }, true); // 添加捕获阶段参数，确保事件被捕获
    
    copyButton.addEventListener('click', () => {
      this.copyMemoContent();
      
      // 显示复制成功提示
      copySuccess.classList.add('show');
      setTimeout(() => {
        copySuccess.classList.remove('show');
      }, 2000);
    });
    
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
  }
  
  /**
   * 复制备忘录内容到剪贴板
   */
  copyMemoContent() {
    if (!this.memoContent) return;
    
    try {
      // 获取纯文本内容
      const text = this.memoContent.innerText || this.memoContent.textContent;
      
      // 使用Clipboard API复制文本
      navigator.clipboard.writeText(text).then(() => {
        console.log('备忘录内容已复制到剪贴板');
      }).catch(err => {
        console.error('复制失败:', err);
        
        // 如果Clipboard API失败，尝试使用传统方法
        this.fallbackCopy(text);
      });
    } catch (error) {
      console.error('复制过程中出错:', error);
      
      // 尝试使用传统方法
      this.fallbackCopy(this.memoContent.innerText || this.memoContent.textContent);
    }
  }
  
  /**
   * 备用复制方法
   * @param {string} text - 要复制的文本
   */
  fallbackCopy(text) {
    try {
      // 创建临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // 设置样式使其不可见
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      
      // 添加到文档
      document.body.appendChild(textArea);
      
      // 选择文本
      textArea.select();
      textArea.setSelectionRange(0, 99999); // 兼容移动设备
      
      // 复制
      document.execCommand('copy');
      
      // 移除临时元素
      document.body.removeChild(textArea);
      
      console.log('使用备用方法复制成功');
    } catch (err) {
      console.error('备用复制方法也失败了:', err);
    }
  }
  
  /**
   * 创建悬浮图标
   */
  async createFloatingIcon() {
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
    
    // 添加拖拽状态跟踪
    let isDragging = false;
    let dragStartTime = 0;
    
    // 添加点击事件
    iconInner.addEventListener('mousedown', (e) => {
      // 记录拖拽开始时间
      dragStartTime = Date.now();
      isDragging = false;
    });
    
    iconInner.addEventListener('mousemove', (e) => {
      // 如果鼠标移动，标记为拖拽状态
      if (dragStartTime > 0 && Date.now() - dragStartTime > 100) {
        isDragging = true;
      }
    });
    
    iconInner.addEventListener('click', (e) => {
      // 检查是否是真正的拖拽
      const wasDragging = this.floatingIcon.getAttribute('data-dragging') === 'true' || 
                         this.floatingIcon.getAttribute('data-just-dragged') === 'true' ||
                         isDragging || 
                         (Date.now() - dragStartTime > 300);
      
      // 如果是拖拽结束，不触发点击事件
      if (wasDragging) {
        e.stopPropagation();
        return;
      }
      
      // 如果是真正的点击，恢复备忘录
      this.restore();
    });
    
    // 添加到文档
    document.body.appendChild(this.floatingIcon);
    
    // 使悬浮图标可拖拽
    this.floatingIconDragHelper = window.dragUtils.makeDraggable(
      this.floatingIcon,
      iconInner,
      async (position) => {
        // 标记为拖拽状态
        isDragging = true;
        
        // 保存悬浮图标位置
        await window.memoManager.updateFloatingIconPosition(position);
      }
    );
    
    // 尝试恢复保存的悬浮图标位置
    try {
      const savedPosition = await window.memoManager.getFloatingIconPosition();
      if (savedPosition && this.floatingIconDragHelper) {
        // 确保位置在视口内
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 获取悬浮图标的尺寸
        this.floatingIcon.style.display = 'flex'; // 临时显示以获取尺寸
        const iconRect = this.floatingIcon.getBoundingClientRect();
        this.floatingIcon.style.display = 'none'; // 恢复隐藏状态
        
        let newX = savedPosition.x;
        let newY = savedPosition.y;
        
        // 确保悬浮图标不会超出右边界
        if (newX + iconRect.width > viewportWidth) {
          newX = viewportWidth - iconRect.width - 20;
        }
        
        // 确保悬浮图标不会超出下边界
        if (newY + iconRect.height > viewportHeight) {
          newY = viewportHeight - iconRect.height - 20;
        }
        
        // 确保悬浮图标不会超出左边界
        if (newX < 0) {
          newX = 20;
        }
        
        // 确保悬浮图标不会超出上边界
        if (newY < 0) {
          newY = 20;
        }
        
        // 设置悬浮图标位置
        this.floatingIconDragHelper.setPosition({ x: newX, y: newY });
      }
    } catch (error) {
      console.error('恢复悬浮图标位置失败:', error);
    }
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
      // 检查备忘录是否完全在视口内
      let needsRepositioning = false;
      
      // 检查是否有部分在视口外
      if (rect.left < 0 || rect.top < 0 || rect.right > viewportWidth || rect.bottom > viewportHeight) {
        needsRepositioning = true;
      }
      
      // 如果备忘录完全不在视口内，重置到右下角
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewportWidth || rect.top >= viewportHeight) {
        this.resetPosition();
      } else if (needsRepositioning) {
        // 调整位置使其完全在视口内
        let newX = rect.left;
        let newY = rect.top;
        
        // 调整水平位置
        if (rect.left < 0) {
          newX = 0;
        } else if (rect.right > viewportWidth) {
          newX = viewportWidth - rect.width;
        }
        
        // 调整垂直位置
        if (rect.top < 0) {
          newY = 0;
        } else if (rect.bottom > viewportHeight) {
          newY = viewportHeight - rect.height;
        }
        
        this.dragHelper.setPosition({ x: newX, y: newY });
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
    
    // 获取备忘录当前位置
    const memoRect = this.memoContainer.getBoundingClientRect();
    
    this.memoContainer.style.display = 'none';
    this.floatingIcon.style.display = 'flex';
    this.isMinimized = true;
    this.isVisible = true;
    
    // 设置悬浮图标位置为备忘录的位置
    if (this.floatingIconDragHelper && memoRect) {
      // 计算悬浮图标的位置，使其位于备忘录的位置
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 获取悬浮图标的尺寸
      const iconRect = this.floatingIcon.getBoundingClientRect();
      
      // 计算悬浮图标的新位置
      let newX = memoRect.left;
      let newY = memoRect.top;
      
      // 确保悬浮图标不会超出右边界
      if (newX + iconRect.width > viewportWidth) {
        newX = viewportWidth - iconRect.width - 20; // 20px的边距
      }
      
      // 确保悬浮图标不会超出下边界
      if (newY + iconRect.height > viewportHeight) {
        newY = viewportHeight - iconRect.height - 20; // 20px的边距
      }
      
      // 确保悬浮图标不会超出左边界
      if (newX < 0) {
        newX = 20; // 20px的边距
      }
      
      // 确保悬浮图标不会超出上边界
      if (newY < 0) {
        newY = 20; // 20px的边距
      }
      
      // 设置悬浮图标的新位置
      this.floatingIconDragHelper.setPosition({ x: newX, y: newY });
      
      // 保存悬浮图标位置
      window.memoManager.updateFloatingIconPosition({ x: newX, y: newY });
    }
  }
  
  /**
   * 从最小化状态恢复
   */
  restore() {
    if (!this.memoContainer || !this.isMinimized) return;
    
    // 获取悬浮图标的位置
    const floatingIconRect = this.floatingIcon.getBoundingClientRect();
    
    // 显示备忘录
    this.memoContainer.style.display = 'block';
    this.floatingIcon.style.display = 'none';
    this.isMinimized = false;
    
    // 根据悬浮图标的位置设置备忘录的位置
    if (this.dragHelper && floatingIconRect) {
      // 计算备忘录的新位置，使其左上角与悬浮图标的位置对齐
      // 但要确保备忘录完全在视口内
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 获取备忘录的尺寸
      const memoRect = this.memoContainer.getBoundingClientRect();
      
      // 计算备忘录的新位置
      let newX = floatingIconRect.left;
      let newY = floatingIconRect.top;
      
      // 确保备忘录不会超出右边界
      if (newX + memoRect.width > viewportWidth) {
        newX = viewportWidth - memoRect.width - 20; // 20px的边距
      }
      
      // 确保备忘录不会超出下边界
      if (newY + memoRect.height > viewportHeight) {
        newY = viewportHeight - memoRect.height - 20; // 20px的边距
      }
      
      // 确保备忘录不会超出左边界
      if (newX < 0) {
        newX = 20; // 20px的边距
      }
      
      // 确保备忘录不会超出上边界
      if (newY < 0) {
        newY = 20; // 20px的边距
      }
      
      // 设置备忘录的新位置
      this.dragHelper.setPosition({ x: newX, y: newY });
      
      // 保存新位置
      window.memoManager.updateMemoPosition({ x: newX, y: newY });
      
      return; // 已经设置了位置，不需要继续执行
    }
    
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
      // 检查备忘录是否完全在视口内
      let needsRepositioning = false;
      
      // 检查是否有部分在视口外
      if (rect.left < 0 || rect.top < 0 || rect.right > viewportWidth || rect.bottom > viewportHeight) {
        needsRepositioning = true;
      }
      
      // 如果备忘录完全不在视口内，重置到右下角
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewportWidth || rect.top >= viewportHeight) {
        this.resetPosition();
      } else if (needsRepositioning) {
        // 调整位置使其完全在视口内
        let newX = rect.left;
        let newY = rect.top;
        
        // 调整水平位置
        if (rect.left < 0) {
          newX = 0;
        } else if (rect.right > viewportWidth) {
          newX = viewportWidth - rect.width;
        }
        
        // 调整垂直位置
        if (rect.top < 0) {
          newY = 0;
        } else if (rect.bottom > viewportHeight) {
          newY = viewportHeight - rect.height;
        }
        
        this.dragHelper.setPosition({ x: newX, y: newY });
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
      
      // 检查备忘录是否完全在视口内
      let needsRepositioning = false;
      let newX = rect.left;
      let newY = rect.top;
      
      // 检查水平方向
      if (rect.left < 0) {
        newX = 0;
        needsRepositioning = true;
      } else if (rect.right > viewportWidth) {
        newX = viewportWidth - rect.width;
        needsRepositioning = true;
      }
      
      // 检查垂直方向
      if (rect.top < 0) {
        newY = 0;
        needsRepositioning = true;
      } else if (rect.bottom > viewportHeight) {
        newY = viewportHeight - rect.height;
        needsRepositioning = true;
      }
      
      // 如果需要重新定位
      if (needsRepositioning) {
        // 如果备忘录完全不在视口内，重置到右下角
        if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewportWidth || rect.top >= viewportHeight) {
          this.resetPosition();
        } else {
          // 否则调整位置使其完全在视口内
          this.dragHelper.setPosition({ x: newX, y: newY });
        }
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
  
  /**
   * 清空备忘录内容
   */
  clearContent() {
    if (!this.memoContent) return;
    
    // 清空内容
    this.memoContent.innerHTML = '';
    
    // 隐藏备忘录
    this.hide();
  }
}

// 创建全局单例实例
window.memoComponent = new MemoComponent(); 