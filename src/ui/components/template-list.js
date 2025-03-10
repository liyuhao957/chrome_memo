/**
 * 模板列表组件
 * 负责模板的显示和管理
 */

class TemplateListComponent {
  constructor() {
    this.templateList = null;
    this.templateEditor = null;
    this.emptyTemplatesMessage = null;
    this.templateNameInput = null;
    this.templateContentInput = null;
    this.sortableHelper = null;
    this.onUseTemplate = null;
  }
  
  /**
   * 初始化模板列表组件
   * @param {HTMLElement} container - 容器元素
   * @param {Function} onUseTemplate - 使用模板的回调函数
   */
  initialize(container, onUseTemplate) {
    if (!container) return this;
    
    this.container = container;
    this.onUseTemplate = onUseTemplate;
    
    this.createTemplateUI();
    this.loadTemplates();
    
    return this;
  }
  
  /**
   * 创建模板UI
   */
  createTemplateUI() {
    // 清空容器
    this.container.innerHTML = '';
    
    // 创建标题
    const title = document.createElement('h1');
    title.textContent = '备忘录模板管理';
    this.container.appendChild(title);
    
    // 创建模板按钮
    const createButton = document.createElement('button');
    createButton.id = 'createTemplateBtn';
    createButton.textContent = '创建新模板';
    createButton.addEventListener('click', () => this.showTemplateEditor());
    this.container.appendChild(createButton);
    
    // 创建模板编辑器
    this.templateEditor = document.createElement('div');
    this.templateEditor.id = 'templateEditor';
    this.templateEditor.className = 'template-editor';
    this.templateEditor.style.display = 'none';
    
    // 模板名称输入
    const nameGroup = document.createElement('div');
    nameGroup.className = 'input-group';
    
    const nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', 'templateName');
    nameLabel.textContent = '模板名称：';
    
    this.templateNameInput = document.createElement('input');
    this.templateNameInput.type = 'text';
    this.templateNameInput.id = 'templateName';
    this.templateNameInput.placeholder = '请输入模板名称';
    
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(this.templateNameInput);
    
    // 模板内容输入
    const contentGroup = document.createElement('div');
    contentGroup.className = 'input-group';
    
    const contentLabel = document.createElement('label');
    contentLabel.setAttribute('for', 'templateContent');
    contentLabel.textContent = '模板内容：';
    
    this.templateContentInput = document.createElement('textarea');
    this.templateContentInput.id = 'templateContent';
    this.templateContentInput.placeholder = '请输入模板内容';
    
    contentGroup.appendChild(contentLabel);
    contentGroup.appendChild(this.templateContentInput);
    
    // 编辑器按钮
    const editorActions = document.createElement('div');
    editorActions.className = 'template-actions';
    
    const cancelButton = document.createElement('button');
    cancelButton.id = 'cancelEditBtn';
    cancelButton.className = 'secondary';
    cancelButton.textContent = '取消';
    cancelButton.addEventListener('click', () => this.hideTemplateEditor());
    
    const saveButton = document.createElement('button');
    saveButton.id = 'saveTemplateBtn';
    saveButton.className = 'primary';
    saveButton.textContent = '保存模板';
    saveButton.addEventListener('click', () => this.saveTemplate());
    
    editorActions.appendChild(cancelButton);
    editorActions.appendChild(saveButton);
    
    // 添加到编辑器容器
    this.templateEditor.appendChild(nameGroup);
    this.templateEditor.appendChild(contentGroup);
    this.templateEditor.appendChild(editorActions);
    
    // 添加编辑器到容器
    this.container.appendChild(this.templateEditor);
    
    // 创建模板列表
    this.templateList = document.createElement('div');
    this.templateList.id = 'templateList';
    this.templateList.className = 'template-list';
    this.container.appendChild(this.templateList);
    
    // 空模板消息
    this.emptyTemplatesMessage = document.createElement('div');
    this.emptyTemplatesMessage.id = 'emptyTemplates';
    this.emptyTemplatesMessage.className = 'empty-list';
    this.emptyTemplatesMessage.textContent = '暂无保存的模板';
    this.emptyTemplatesMessage.style.display = 'none';
    this.container.appendChild(this.emptyTemplatesMessage);
  }
  
  /**
   * 加载模板列表
   */
  async loadTemplates() {
    try {
      const templates = await window.templateManager.getTemplateList();
      
      // 清空模板列表
      this.templateList.innerHTML = '';
      
      if (templates.length === 0) {
        this.templateList.style.display = 'none';
        this.emptyTemplatesMessage.style.display = 'block';
        return;
      }
      
      this.templateList.style.display = 'block';
      this.emptyTemplatesMessage.style.display = 'none';
      
      // 添加模板到列表
      templates.forEach(template => {
        const templateItem = this.createTemplateItem(template);
        this.templateList.appendChild(templateItem);
      });
      
      // 应用排序功能
      this.applySorting();
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  }
  
  /**
   * 创建模板项
   * @param {Object} template - 模板数据
   * @returns {HTMLElement} 模板项元素
   */
  createTemplateItem(template) {
    const item = document.createElement('div');
    item.className = 'template-item';
    item.dataset.name = template.name;
    
    // 模板头部
    const header = document.createElement('div');
    header.className = 'template-header';
    
    // 模板标题
    const title = document.createElement('div');
    title.className = 'template-title';
    
    const icon = document.createElement('span');
    icon.className = 'template-icon';
    icon.textContent = '📝';
    
    const name = document.createElement('span');
    name.className = 'template-name';
    name.textContent = template.name;
    
    title.appendChild(icon);
    title.appendChild(name);
    
    // 模板日期
    const date = document.createElement('div');
    date.className = 'template-date';
    
    // 格式化日期
    const formattedDate = new Date(template.updatedAt).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    date.textContent = `最后更新: ${formattedDate}`;
    
    // 添加到头部
    header.appendChild(title);
    header.appendChild(date);
    
    // 模板预览
    const preview = document.createElement('div');
    preview.className = 'template-preview';
    
    const previewContent = document.createElement('div');
    previewContent.className = 'preview-content';
    
    // 移除HTML标签以纯文本显示
    const tempElement = document.createElement('div');
    tempElement.innerHTML = template.content;
    previewContent.textContent = tempElement.textContent;
    
    preview.appendChild(previewContent);
    
    // 模板操作
    const actions = document.createElement('div');
    actions.className = 'template-actions';
    
    // 使用按钮
    const useButton = document.createElement('button');
    useButton.className = 'action-btn use-template';
    useButton.innerHTML = '<span class="btn-icon">✓</span> 使用模板';
    useButton.addEventListener('click', () => {
      if (this.onUseTemplate) {
        this.onUseTemplate(template.name, template.content);
      }
    });
    
    // 编辑按钮
    const editButton = document.createElement('button');
    editButton.className = 'action-btn edit-template';
    editButton.innerHTML = '<span class="btn-icon">✎</span> 编辑';
    editButton.addEventListener('click', () => {
      this.editTemplate(template.name, template.content);
    });
    
    // 删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.className = 'action-btn delete-template';
    deleteButton.innerHTML = '<span class="btn-icon">✕</span> 删除';
    deleteButton.addEventListener('click', () => {
      this.deleteTemplate(template.name);
    });
    
    // 添加按钮
    actions.appendChild(useButton);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    
    // 组装模板项
    item.appendChild(header);
    item.appendChild(preview);
    item.appendChild(actions);
    
    return item;
  }
  
  /**
   * 应用模板排序功能
   */
  applySorting() {
    const templateItems = this.templateList.querySelectorAll('.template-item');
    
    if (this.sortableHelper) {
      this.sortableHelper.cleanup();
    }
    
    this.sortableHelper = window.dragUtils.makeTemplatesSortable(
      templateItems,
      async (newOrder) => {
        // 保存新的排序顺序
        await window.templateManager.updateTemplateOrder(newOrder);
      }
    );
  }
  
  /**
   * 显示模板编辑器
   * @param {string} name - 模板名称
   * @param {string} content - 模板内容
   */
  showTemplateEditor(name = '', content = '') {
    this.templateNameInput.value = name;
    this.templateContentInput.value = content;
    this.templateEditor.style.display = 'block';
    this.templateNameInput.focus();
  }
  
  /**
   * 隐藏模板编辑器
   */
  hideTemplateEditor() {
    this.templateEditor.style.display = 'none';
    this.templateNameInput.value = '';
    this.templateContentInput.value = '';
  }
  
  /**
   * 保存模板
   */
  async saveTemplate() {
    const name = this.templateNameInput.value.trim();
    const content = this.templateContentInput.value.trim();
    
    if (!name) {
      alert('请输入模板名称');
      this.templateNameInput.focus();
      return;
    }
    
    if (!content) {
      alert('请输入模板内容');
      this.templateContentInput.focus();
      return;
    }
    
    try {
      await window.templateManager.saveTemplate(name, content);
      this.hideTemplateEditor();
      this.loadTemplates();
    } catch (error) {
      console.error('保存模板失败:', error);
      alert('保存模板失败: ' + error.message);
    }
  }
  
  /**
   * 编辑模板
   * @param {string} name - 模板名称
   * @param {string} content - 模板内容
   */
  editTemplate(name, content) {
    this.showTemplateEditor(name, content);
  }
  
  /**
   * 删除模板
   * @param {string} name - 模板名称
   */
  async deleteTemplate(name) {
    if (!confirm(`确定要删除模板 "${name}" 吗？`)) {
      return;
    }
    
    try {
      await window.templateManager.deleteTemplate(name);
      this.loadTemplates();
    } catch (error) {
      console.error('删除模板失败:', error);
      alert('删除模板失败: ' + error.message);
    }
  }
}

// 创建全局单例实例
window.templateListComponent = new TemplateListComponent(); 