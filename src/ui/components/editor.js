/**
 * 编辑器组件
 * 提供富文本编辑功能
 */

class EditorComponent {
  constructor() {
    this.editorOverlay = null;
    this.editorContainer = null;
    this.editor = null;
    this.dragHelper = null;
    this.saveCallback = null;
    this.cancelCallback = null;
    this.templateSelector = null;
  }
  
  /**
   * 初始化编辑器
   * @param {Function} onSave - 保存回调函数
   * @param {Function} onCancel - 取消回调函数
   */
  initialize(onSave, onCancel) {
    this.saveCallback = onSave;
    this.cancelCallback = onCancel;
    
    this.createEditorUI();
    return this;
  }
  
  /**
   * 创建编辑器UI
   */
  createEditorUI() {
    // 如果已存在，先移除
    if (this.editorOverlay) {
      document.body.removeChild(this.editorOverlay);
    }
    
    // 创建遮罩层
    this.editorOverlay = document.createElement('div');
    this.editorOverlay.className = 'chrome-memo-editor-overlay';
    this.editorOverlay.style.display = 'none';
    
    // 创建编辑器容器
    this.editorContainer = document.createElement('div');
    this.editorContainer.className = 'chrome-memo-editor-container';
    
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
    
    // 创建工具栏
    const toolbar = document.createElement('div');
    toolbar.className = 'chrome-memo-editor-toolbar';
    
    // 工具栏按钮
    const formatButtons = [
      { title: '粗体', command: 'bold', icon: '<b>B</b>' },
      { title: '斜体', command: 'italic', icon: '<i>I</i>' },
      { title: '下划线', command: 'underline', icon: '<u>U</u>' },
      { title: '无序列表', command: 'insertUnorderedList', icon: '•' },
      { title: '有序列表', command: 'insertOrderedList', icon: '1.' }
    ];
    
    // 添加格式按钮
    formatButtons.forEach(button => {
      const btnElement = document.createElement('button');
      btnElement.title = button.title;
      btnElement.innerHTML = button.icon;
      btnElement.addEventListener('click', () => {
        document.execCommand(button.command);
        this.editor.focus();
      });
      toolbar.appendChild(btnElement);
    });
    
    // 模板选择器
    const templateWrapper = document.createElement('div');
    templateWrapper.className = 'template-selector-wrapper';
    
    const templateLabel = document.createElement('span');
    templateLabel.className = 'template-selector-label';
    templateLabel.textContent = '使用模板：';
    
    this.templateSelector = document.createElement('select');
    this.templateSelector.id = 'template-selector';
    
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '选择模板...';
    this.templateSelector.appendChild(defaultOption);
    
    // 加载模板到选择器
    this.loadTemplates();
    
    // 模板选择事件
    this.templateSelector.addEventListener('change', async () => {
      const selectedValue = this.templateSelector.value;
      if (selectedValue) {
        const templateContent = await window.templateManager.getTemplateContent(selectedValue);
        if (templateContent) {
          this.editor.innerHTML = templateContent;
        }
        
        // 重置选择器
        this.templateSelector.value = '';
      }
    });
    
    templateWrapper.appendChild(templateLabel);
    templateWrapper.appendChild(this.templateSelector);
    toolbar.appendChild(templateWrapper);
    
    // 创建编辑器
    this.editor = document.createElement('div');
    this.editor.className = 'chrome-memo-editor';
    this.editor.contentEditable = true;
    this.editor.setAttribute('placeholder', '在此处输入备忘录内容...');
    
    // 编辑器底部
    const footer = document.createElement('div');
    footer.className = 'chrome-memo-editor-footer';
    
    // 取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.className = 'chrome-memo-editor-cancel';
    cancelButton.textContent = '取消';
    cancelButton.addEventListener('click', () => this.cancel());
    
    // 保存按钮
    const saveButton = document.createElement('button');
    saveButton.className = 'chrome-memo-editor-save';
    saveButton.textContent = '保存';
    saveButton.addEventListener('click', () => this.save());
    
    // 添加按钮到底部
    footer.appendChild(cancelButton);
    footer.appendChild(saveButton);
    
    // 将所有元素添加到编辑器容器
    this.editorContainer.appendChild(header);
    this.editorContainer.appendChild(toolbar);
    this.editorContainer.appendChild(this.editor);
    this.editorContainer.appendChild(footer);
    
    // 将编辑器容器添加到遮罩层
    this.editorOverlay.appendChild(this.editorContainer);
    
    // 添加到文档
    document.body.appendChild(this.editorOverlay);
    
    // 使编辑器可拖拽
    this.makeDraggable(header);
    
    // 添加样式效果
    this.addFormatButtonsHoverEffect();
  }
  
  /**
   * 加载模板到选择器
   */
  async loadTemplates() {
    try {
      const templates = await window.templateManager.getTemplateList();
      
      // 清除已有选项（除了默认选项）
      while (this.templateSelector.options.length > 1) {
        this.templateSelector.remove(1);
      }
      
      // 添加模板选项
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.name;
        option.textContent = template.name;
        this.templateSelector.appendChild(option);
      });
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  }
  
  /**
   * 为格式按钮添加悬停效果
   */
  addFormatButtonsHoverEffect() {
    const toolbar = this.editorContainer.querySelector('.chrome-memo-editor-toolbar');
    const buttons = toolbar.querySelectorAll('button');
    
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#f0f0f0';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'transparent';
      });
    });
  }
  
  /**
   * 使编辑器可拖拽
   * @param {HTMLElement} handle - 拖拽把手
   */
  makeDraggable(handle) {
    // 如果已有拖拽实例，先清理
    if (this.dragHelper) {
      this.dragHelper.cleanup();
    }
    
    // 创建新的拖拽实例
    this.dragHelper = window.dragUtils.makeDraggable(
      this.editorContainer,
      handle,
      // 拖拽结束回调
      () => {
        // 标记编辑器已被拖拽，使用绝对定位
        this.editorContainer.classList.add('has-been-dragged');
      }
    );
  }
  
  /**
   * 打开编辑器
   * @param {string} content - 初始内容
   */
  open(content = '') {
    if (!this.editorOverlay) {
      this.createEditorUI();
    }
    
    // 移除已拖拽标记，返回到默认居中状态
    this.editorContainer.classList.remove('has-been-dragged');
    
    // 如果之前被拖拽过，重置位置样式
    this.editorContainer.style.transform = '';
    this.editorContainer.style.top = '';
    this.editorContainer.style.left = '';
    
    this.editor.innerHTML = content;
    this.editorOverlay.style.display = 'flex';
    this.editor.focus();
    
    // 重新加载模板
    this.loadTemplates();
  }
  
  /**
   * 关闭编辑器
   */
  close() {
    if (this.editorOverlay) {
      this.editorOverlay.style.display = 'none';
    }
  }
  
  /**
   * 保存编辑内容
   */
  save() {
    const content = this.editor.innerHTML;
    
    if (this.saveCallback) {
      this.saveCallback(content);
    }
    
    this.close();
  }
  
  /**
   * 取消编辑
   */
  cancel() {
    if (this.cancelCallback) {
      this.cancelCallback();
    }
    
    this.close();
  }
  
  /**
   * 获取当前编辑器内容
   * @returns {string} 内容HTML
   */
  getContent() {
    return this.editor ? this.editor.innerHTML : '';
  }
  
  /**
   * 保存当前内容为模板
   * @param {string} name - 模板名称，为空时自动生成
   */
  async saveAsTemplate(name = '') {
    const content = this.getContent();
    if (!content) return;
    
    try {
      await window.templateManager.saveContentAsTemplate(content, name);
      this.loadTemplates(); // 重新加载模板列表
      
      // 显示成功提示
      this.showToast('已保存为模板');
    } catch (error) {
      console.error('保存模板失败:', error);
      this.showToast('保存模板失败', 'error');
    }
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