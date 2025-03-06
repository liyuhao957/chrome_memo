document.addEventListener('DOMContentLoaded', function() {
  const templateList = document.getElementById('templateList');
  const emptyTemplates = document.getElementById('emptyTemplates');
  const templateEditor = document.getElementById('templateEditor');
  const templateName = document.getElementById('templateName');
  const templateContent = document.getElementById('templateContent');
  const createTemplateBtn = document.getElementById('createTemplateBtn');
  const saveTemplateBtn = document.getElementById('saveTemplateBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  
  // 加载所有模板
  loadTemplates();
  
  // 创建模板按钮事件
  createTemplateBtn.addEventListener('click', function() {
    templateName.value = '';
    templateContent.value = '';
    templateEditor.style.display = 'block';
    templateName.focus();
  });
  
  // 取消编辑按钮事件
  cancelEditBtn.addEventListener('click', function() {
    templateEditor.style.display = 'none';
  });
  
  // 保存模板按钮事件
  saveTemplateBtn.addEventListener('click', function() {
    const name = templateName.value.trim();
    const content = templateContent.value.trim();
    
    if (!name) {
      alert('请输入模板名称');
      return;
    }
    
    if (!content) {
      alert('请输入模板内容');
      return;
    }
    
    chrome.runtime.sendMessage({
      action: 'saveTemplate',
      name: name,
      content: content
    }, function() {
      templateEditor.style.display = 'none';
      loadTemplates();
    });
  });
  
  // 加载模板列表函数
  function loadTemplates() {
    chrome.runtime.sendMessage({ action: 'getAllTemplates' }, function(response) {
      const templates = response.data || {};
      
      // 将模板转换为数组并按照 order 字段排序
      const sortedTemplates = Object.entries(templates)
        .sort((a, b) => {
          // 使用 order 字段进行排序，如果不存在则使用创建时间
          const orderA = a[1].order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b[1].order ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
      
      // 获取排序后的模板名称数组
      const templateNames = sortedTemplates.map(entry => entry[0]);
      
      if (!templateNames || templateNames.length === 0) {
        templateList.innerHTML = '';
        emptyTemplates.style.display = 'block';
        return;
      }
      
      emptyTemplates.style.display = 'none';
      
      // 修改模板列表的渲染，添加拖拽属性
      templateList.innerHTML = templateNames.map(name => {
        const template = templates[name];
        const previewContent = template.content.replace(/<[^>]*>/g, '').slice(0, 100);
        const date = new Date(template.createdAt || Date.now()).toLocaleDateString();
        
        return `
          <div class="template-item" draggable="true" data-name="${name}">
            <div class="template-header">
              <div class="template-title">
                <span class="template-icon">📝</span>
                <span class="template-name">${name}</span>
              </div>
              <span class="template-date">创建于 ${date}</span>
            </div>
            
            <div class="template-preview">
              <div class="preview-content">${previewContent}</div>
            </div>
            
            <div class="template-actions">
              <button class="action-btn edit-template" data-name="${name}">
                <span class="btn-icon">✏️</span>编辑
              </button>
              <button class="action-btn use-template" data-name="${name}">
                <span class="btn-icon">✨</span>使用
              </button>
              <button class="action-btn delete-template" data-name="${name}">
                <span class="btn-icon">🗑️</span>删除
              </button>
            </div>
          </div>
        `;
      }).join('');

      // 重新绑定事件处理器
      document.querySelectorAll('.edit-template').forEach(button => {
        button.addEventListener('click', function() {
          const name = this.dataset.name;
          chrome.runtime.sendMessage({
            action: 'getTemplate',
            name: name
          }, function(response) {
            if (response.data) {
              templateName.value = name;
              templateContent.value = response.data.content;
              templateEditor.style.display = 'block';
            }
          });
        });
      });

      document.querySelectorAll('.delete-template').forEach(button => {
        button.addEventListener('click', function() {
          const name = this.dataset.name;
          if (confirm(`确定要删除模板"${name}"吗？`)) {
            chrome.runtime.sendMessage({
              action: 'deleteTemplate',
              name: name
            }, function() {
              loadTemplates();
            });
          }
        });
      });

      document.querySelectorAll('.use-template').forEach(button => {
        button.addEventListener('click', function() {
          const name = this.dataset.name;
          chrome.runtime.sendMessage({
            action: 'getTemplate',
            name: name
          }, function(response) {
            if (response.data) {
              // 这里可以添加使用模板的逻辑
              alert(`已选择模板: ${name}`);
            }
          });
        });
      });
      
      // 添加拖拽排序功能
      const templateItems = document.querySelectorAll('.template-item');
      
      templateItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
      });
    });
  }
  
  // 拖拽相关函数
  let dragSrcEl = null;
  
  function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
  }
  
  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }
  
  function handleDragEnter(e) {
    this.classList.add('over');
  }
  
  function handleDragLeave(e) {
    this.classList.remove('over');
  }
  
  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    
    if (dragSrcEl !== this) {
      // 保存拖拽前后的名称，用于更新顺序
      const srcName = dragSrcEl.dataset.name;
      const destName = this.dataset.name;
      
      // 交换DOM元素位置
      const parent = this.parentNode;
      const srcNextSibling = dragSrcEl.nextSibling;
      
      if (this.nextSibling === dragSrcEl) {
        parent.insertBefore(dragSrcEl, this);
      } else {
        parent.insertBefore(dragSrcEl, this.nextSibling);
        if (srcNextSibling === this) {
          parent.insertBefore(this, dragSrcEl);
        } else {
          parent.insertBefore(this, srcNextSibling);
        }
      }
      
      // 获取新的顺序
      updateTemplateOrder();
    }
    
    return false;
  }
  
  function handleDragEnd(e) {
    document.querySelectorAll('.template-item').forEach(item => {
      item.classList.remove('over');
      item.classList.remove('dragging');
    });
  }
  
  function updateTemplateOrder() {
    // 收集拖拽后的新顺序
    const newOrder = Array.from(templateList.children)
      .filter(item => item.dataset.name)
      .map(item => item.dataset.name);
    
    // 更新存储中的顺序
    chrome.runtime.sendMessage({ action: 'getAllTemplates' }, function(response) {
      const templates = response.data || {};
      const newTemplates = {};
      
      // 按新顺序重建模板对象，并更新 order 字段
      newOrder.forEach((name, index) => {
        if (templates[name]) {
          newTemplates[name] = {
            ...templates[name],
            order: index
          };
        }
      });
      
      // 保存更新后的模板
      chrome.storage.local.set({ templates: newTemplates }, () => {
        console.log('模板顺序已更新:', newOrder);
      });
    });
  }
}); 