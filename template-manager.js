// 简化版模板管理系统 - 直接使用localStorage

// 保存当前编辑器中的内容为模板
function saveAsTemplate(content, name) {
  // 获取现有模板
  const templates = JSON.parse(localStorage.getItem('memoTemplates') || '{}');
  
  // 添加新模板
  templates[name] = {
    content: content,
    createdAt: Date.now()
  };
  
  // 保存回localStorage
  localStorage.setItem('memoTemplates', JSON.stringify(templates));
  
  return true;
}

// 获取所有模板
function getAllTemplates() {
  return JSON.parse(localStorage.getItem('memoTemplates') || '{}');
}

// 使用指定名称的模板
function useTemplate(name, callback) {
  const templates = getAllTemplates();
  if (templates[name]) {
    callback(templates[name].content);
    return true;
  }
  return false;
}

// 删除模板
function deleteTemplate(name) {
  const templates = getAllTemplates();
  if (templates[name]) {
    delete templates[name];
    localStorage.setItem('memoTemplates', JSON.stringify(templates));
    return true;
  }
  return false;
} 