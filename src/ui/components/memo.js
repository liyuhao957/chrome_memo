/**
 * 备忘录组件类
 * 负责备忘录UI的创建和管理
 */

import { dragUtils } from '../utils/drag-utils.js';
import { memoManager } from '../../core/memo-manager.js';

class MemoComponent {
  constructor() {
    this.memoContainer = null;
    this.memoContent = null;
    this.isVisible = false;
    this.dragHelper = null;
    this.isMinimized = false;
    this.floatingIcon = null;
  }
  
  /**
   * 初始化备忘录组件
   * @param {Function} onEditClick - 编辑按钮点击回调
   */
  async initialize(onEditClick) {
    this.onEditClick = onEditClick;
    
    // 加载当前网站的备忘录数据
    const memo = await memoManager.loadCurrentMemo();
    
    // 创建备忘录UI
    this.createMemoUI(memo);
    
    // 如果有数据且设置为可见，则显示备忘录
    if (memo && memo.isVisible) {
      this.show();
    }
    
    return this;
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
    this.memoContainer.className = 'chrome-memo-container';
    
    // 创建备忘录头部
    const header = document.createElement('div');
    header.className = 'chrome-memo-header';
    
    // 网站指示器
    const siteIndicator = document.createElement('div');
    siteIndicator.className = 'chrome-memo-site-indicator';
    siteIndicator.innerHTML = `<strong>${window.location.hostname}</strong>`;
    
    // 头部操作区
    const headerActions = document.createElement('div');
    headerActions.className = 'chrome-memo-header-actions';
    
    // 编辑按钮
    const editButton = document.createElement('button');
    editButton.className = 'chrome-memo-edit';
    editButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    editButton.title = '编辑备忘录';
    editButton.addEventListener('click', () => {
      if (this.onEditClick) {
        this.onEditClick(this.memoContent.innerHTML);
      }
    });
    
    // 重置位置按钮
    const resetPositionButton = document.createElement('button');
    resetPositionButton.className = 'chrome-memo-reset-position';
    resetPositionButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="9" x2="15" y2="15"></line>
        <line x1="15" y1="9" x2="9" y2="15"></line>
      </svg>
    `;
    resetPositionButton.title = '重置位置';
    resetPositionButton.addEventListener('click', () => {
      this.resetPosition();
    });
    
    // 最小化按钮
    const minimizeButton = document.createElement('button');
    minimizeButton.className = 'chrome-memo-minimize';
    minimizeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    `;
    minimizeButton.title = '最小化';
    minimizeButton.addEventListener('click', () => {
      this.minimize();
    });
    
    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'chrome-memo-close';
    closeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeButton.title = '关闭';
    closeButton.addEventListener('click', () => {
      this.hide();
    });
    
    // 添加按钮到头部操作区
    headerActions.appendChild(editButton);
    headerActions.appendChild(resetPositionButton);
    headerActions.appendChild(minimizeButton);
    headerActions.appendChild(closeButton);
    
    // 将网站指示器和头部操作区添加到头部
    header.appendChild(siteIndicator);
    header.appendChild(headerActions);
    
    // 创建备忘录内容区
    this.memoContent = document.createElement('div');
    this.memoContent.className = 'chrome-memo-content';
    this.memoContent.innerHTML = memoData && memoData.content ? memoData.content : '';
    
    // 将头部和内容区添加到备忘录容器
    this.memoContainer.appendChild(header);
    this.memoContainer.appendChild(this.memoContent);
    
    // 添加到文档
    document.body.appendChild(this.memoContainer);
    
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
    this.floatingIcon.className = 'chrome-memo-floating-icon';
    this.floatingIcon.innerHTML = `
      <div class="floating-icon-inner">M</div>
      <div class="floating-icon-tooltip">打开备忘录</div>
    `;
    this.floatingIcon.style.display = 'none';
    
    this.floatingIcon.addEventListener('click', () => {
      this.restore();
    });
    
    document.body.appendChild(this.floatingIcon);
    
    // 使悬浮图标可拖拽
    dragUtils.makeDraggable(this.floatingIcon);
  }
  
  /**
   * 显示备忘录
   */
  async show() {
    if (!this.memoContainer) return;
    
    this.memoContainer.style.display = 'block';
    this.isVisible = true;
    this.isMinimized = false;
    this.floatingIcon.style.display = 'none';
    
    // 更新存储中的可见状态
    await memoManager.setMemoVisibility(true);
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
    await memoManager.setMemoVisibility(false);
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
  }
  
  /**
   * 从最小化状态恢复
   */
  restore() {
    if (!this.memoContainer || !this.isMinimized) return;
    
    this.memoContainer.style.display = 'block';
    this.floatingIcon.style.display = 'none';
    this.isMinimized = false;
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
    this.dragHelper = dragUtils.makeDraggable(
      this.memoContainer,
      handle,
      async (position) => {
        // 保存新位置到存储
        await memoManager.updateMemoPosition(position);
      }
    );
    
    // 设置初始位置
    if (initialPosition) {
      this.dragHelper.setPosition(initialPosition);
    }
  }
  
  /**
   * 重置备忘录位置
   */
  async resetPosition() {
    const defaultPosition = { x: 20, y: 20 };
    
    dragUtils.resetPosition(this.memoContainer, defaultPosition, async () => {
      // 保存新位置到存储
      await memoManager.updateMemoPosition(defaultPosition);
    });
  }
  
  /**
   * 更新备忘录内容
   * @param {string} content - 新的备忘录内容
   */
  async updateContent(content) {
    if (!this.memoContent) return;
    
    this.memoContent.innerHTML = content;
    
    // 保存更新后的内容
    await memoManager.saveMemo(content);
  }
}

// 导出备忘录组件类
export const memoComponent = new MemoComponent(); 