/**
 * 编辑器组件
 * 提供富文本编辑功能
 */

class EditorComponent {
  constructor() {
    this.container = null;
    this.editor = null;
    this.onSave = null;
    this.onCancel = null;
    this.isOpen = false;
  }
  
  /**
   * 初始化编辑器
   * @param {Function} onSave - 保存回调函数
   * @param {Function} onCancel - 取消回调函数
   */
  initialize(onSave, onCancel) {
    this.onSave = onSave;
    this.onCancel = onCancel;
    
    return this;
  }
  
  /**
   * 创建编辑器UI
   */
  createEditorUI() {
    // 如果已存在，先移除
    if (this.container) {
      document.body.removeChild(this.container);
    }
    
    // 创建编辑器容器
    this.container = document.createElement('div');
    this.container.className = 'chrome-memo-editor-container';
    this.container.style.display = 'none'; // 确保初始状态为隐藏
    
    // 确保初始位置正确
    this.container.style.top = '50%';
    this.container.style.left = '50%';
    this.container.style.transform = 'translate(-50%, -50%)';
    
    // 创建编辑器头部
    const header = document.createElement('div');
    header.className = 'chrome-memo-editor-header';
    
    // 网站信息
    const siteInfo = document.createElement('div');
    siteInfo.className = 'chrome-memo-editor-site-info';
    siteInfo.innerHTML = `
      <span class="site-label">网站：</span>
      <span class="site-value">${document.title}</span>
    `;
    
    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'chrome-memo-editor-close';
    closeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeButton.addEventListener('click', () => this.cancel());
    
    // 将网站信息和关闭按钮添加到头部
    header.appendChild(siteInfo);
    header.appendChild(closeButton);
    
    // 添加格式化工具栏
    const toolbar = document.createElement('div');
    toolbar.className = 'chrome-memo-editor-toolbar';
    
    // 添加格式化按钮
    const formatButtons = [
      { command: 'bold', icon: '<b>B</b>', title: '粗体' },
      { command: 'italic', icon: '<i>I</i>', title: '斜体' },
      { command: 'underline', icon: '<u>U</u>', title: '下划线' },
      { command: 'strikeThrough', icon: '<s>S</s>', title: '删除线' },
      { command: 'insertOrderedList', icon: '1.', title: '有序列表' },
      { command: 'insertUnorderedList', icon: '•', title: '无序列表' }
    ];
    
    formatButtons.forEach(button => {
      const btnElement = document.createElement('button');
      btnElement.title = button.title;
      btnElement.innerHTML = button.icon;
      btnElement.dataset.command = button.command;
      btnElement.addEventListener('click', () => {
        document.execCommand(button.command);
        this.updateFormatButtonsState();
        this.editor.focus();
      });
      toolbar.appendChild(btnElement);
    });
    
    // 添加按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'chrome-memo-editor-footer';
    
    // 保存按钮
    const saveButton = document.createElement('button');
    saveButton.className = 'chrome-memo-editor-save';
    saveButton.textContent = '保存';
    saveButton.addEventListener('click', () => this.save());
    
    // 取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.className = 'chrome-memo-editor-cancel';
    cancelButton.textContent = '取消';
    cancelButton.addEventListener('click', () => this.cancel());
    
    // 添加按钮到容器
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    
    // 创建编辑器
    this.editor = document.createElement('div');
    this.editor.className = 'chrome-memo-editor';
    this.editor.contentEditable = true;
    this.editor.setAttribute('placeholder', '在此处输入备忘录内容...');
    
    // 监听编辑器内容变化，更新格式按钮状态
    this.editor.addEventListener('keyup', () => this.updateFormatButtonsState());
    this.editor.addEventListener('mouseup', () => this.updateFormatButtonsState());
    
    // 组装编辑器
    this.container.appendChild(header);
    this.container.appendChild(toolbar);
    this.container.appendChild(this.editor);
    this.container.appendChild(buttonContainer);
    
    // 添加到文档
    document.body.appendChild(this.container);
    
    // 使编辑器可拖动
    this.makeDraggable(header);
    
    this.addFormatButtonsHoverEffect();
  }
  
  /**
   * 为格式按钮添加悬停效果
   */
  addFormatButtonsHoverEffect() {
    const toolbar = this.container.querySelector('.chrome-memo-editor-toolbar');
    const buttons = toolbar.querySelectorAll('button');
    
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        if (!button.classList.contains('active')) {
          button.style.backgroundColor = '#f0f0f0';
        }
      });
      
      button.addEventListener('mouseleave', () => {
        if (!button.classList.contains('active')) {
          button.style.backgroundColor = 'transparent';
        }
      });
    });
  }
  
  /**
   * 更新格式按钮的状态
   * 根据当前选中文本的格式，高亮显示对应的格式按钮
   */
  updateFormatButtonsState() {
    if (!this.container) return;
    
    const toolbar = this.container.querySelector('.chrome-memo-editor-toolbar');
    const buttons = toolbar.querySelectorAll('button');
    
    // 检查每个格式按钮对应的命令状态
    buttons.forEach(button => {
      const command = button.dataset.command;
      if (!command) return;
      
      // 检查命令是否处于激活状态
      const isActive = document.queryCommandState(command);
      
      // 更新按钮样式
      if (isActive) {
        button.classList.add('active');
        button.style.backgroundColor = '#e0e0ff';
        button.style.color = '#7c4dff';
        button.style.fontWeight = 'bold';
      } else {
        button.classList.remove('active');
        button.style.backgroundColor = 'transparent';
        button.style.color = '';
        button.style.fontWeight = '';
      }
    });
  }
  
  /**
   * 使编辑器可拖拽
   * @param {HTMLElement} handle - 拖拽把手元素
   */
  makeDraggable(handle) {
    if (!window.dragUtils) {
      console.error('DragUtils未初始化，无法启用拖拽功能');
      return;
    }
    
    // 创建新的拖拽实例
    this.dragHelper = window.dragUtils.makeDraggable(
      this.container,
      handle,
      // 拖拽结束回调
      () => {
        // 标记编辑器已被拖拽，使用绝对定位
        this.container.classList.add('has-been-dragged');
        
        // 确保拖拽后不会回到原位置
        if (this.container.classList.contains('has-been-dragged')) {
          this.container.style.transform = 'none';
        }
      }
    );
  }
  
  /**
   * 打开编辑器
   * @param {string} content - 初始内容
   */
  open(content = '') {
    if (!this.container) {
      this.createEditorUI();
    }
    
    // 先设置内容但保持隐藏状态
    this.editor.innerHTML = content;
    
    // 先隐藏编辑器，以便重置样式
    this.container.style.display = 'none';
    
    // 移除已拖拽标记，返回到默认居中状态
    this.container.classList.remove('has-been-dragged');
    
    // 如果之前被拖拽过，重置位置样式
    this.container.style.transform = 'translate(-50%, -50%)';
    this.container.style.top = '50%';
    this.container.style.left = '50%';
    
    // 使用requestAnimationFrame确保在下一帧渲染前显示编辑器
    requestAnimationFrame(() => {
      this.container.style.display = 'flex';
      this.isOpen = true;
      
      // 更新格式按钮状态
      setTimeout(() => {
        this.updateFormatButtonsState();
      }, 100);
      
      this.editor.focus();
    });
  }
  
  /**
   * 关闭编辑器
   */
  close() {
    if (this.container) {
      this.container.style.display = 'none';
      this.isOpen = false;
    }
  }
  
  /**
   * 保存编辑内容
   */
  save() {
    const content = this.editor.innerHTML;
    
    if (this.onSave) {
      this.onSave(content);
    }
    
    this.close();
  }
  
  /**
   * 取消编辑
   */
  cancel() {
    if (this.onCancel) {
      this.onCancel();
    }
    
    this.close();
  }
  
  /**
   * 获取编辑器内容
   * @returns {string} 编辑器内容
   */
  getContent() {
    return this.editor ? this.editor.innerHTML : '';
  }
  
  /**
   * 显示提示消息
   * @param {string} message - 提示消息
   * @param {string} type - 提示类型 success/error
   */
  showToast(message, type = 'success') {
    let toast = document.querySelector('.chrome-memo-toast');
    
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'chrome-memo-toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `chrome-memo-toast ${type === 'error' ? 'error' : 'success'}`;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }
}

// 创建全局单例实例
window.editorComponent = new EditorComponent(); 