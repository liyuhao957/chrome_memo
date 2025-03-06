document.addEventListener("DOMContentLoaded", () => {
  console.log("开始绑定基本功能");
  
  // 首先绑定导出导入按钮事件
  try {
    const exportBtn = document.getElementById("exportDataBtn");
    if (exportBtn) {
      console.log("找到导出按钮，绑定事件");
      exportBtn.addEventListener("click", function() {
        console.log("导出按钮被点击");
        exportData();
      });
    } else {
      console.error("未找到导出按钮元素");
    }
    
    const importBtn = document.getElementById("importDataBtn");
    if (importBtn) {
      console.log("找到导入按钮，绑定事件");
      importBtn.addEventListener("click", function() {
        console.log("导入按钮被点击");
        document.getElementById("fileInput").click();
      });
    } else {
      console.error("未找到导入按钮元素");
    }
    
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
      console.log("找到文件输入框，绑定事件");
      fileInput.addEventListener("change", function(event) {
        console.log("文件选择事件触发");
        importData(event);
      });
    } else {
      console.error("未找到文件输入元素");
    }
  } catch (e) {
    console.error("绑定导出导入按钮事件时出错:", e);
  }
  
  const statusElem = document.getElementById("status");
  const addEditButton = document.getElementById("addEditButton");
  const toggleButton = document.getElementById("toggleButton");
  const siteList = document.getElementById("siteList");
  const emptyList = document.getElementById("emptyList");
  
  // 立即尝试加载保存的站点
  loadSavedSites();
  
  // 获取当前选项卡信息
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentTab = tabs[0];
    const url = new URL(currentTab.url);
    const domain = url.hostname;
    
    // 查询该域名的备忘录
    chrome.runtime.sendMessage(
      { action: "getMemo", domain: domain },
      (response) => {
        if (response.data) {
          const status = response.data.isVisible ? "可见" : "隐藏";
          statusElem.textContent = `当前网站 (${domain}) 已有备忘录，状态: ${status}`;
          toggleButton.textContent = response.data.isVisible ? "隐藏备忘录" : "显示备忘录";
        } else {
          statusElem.textContent = `当前网站 (${domain}) 没有备忘录`;
          toggleButton.disabled = true;
        }
      }
    );
  });
  
  // 添加/编辑备忘录按钮点击事件
  addEditButton.addEventListener("click", () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const currentTab = tabs[0];
      chrome.tabs.sendMessage(currentTab.id, {
        action: "openEditor"
      });
      // 关闭弹出窗口
      window.close();
    });
  });
  
  // 显示/隐藏备忘录按钮点击事件
  toggleButton.addEventListener("click", () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const currentTab = tabs[0];
      chrome.tabs.sendMessage(currentTab.id, {
        action: "toggleMemo"
      });
      // 关闭弹出窗口
      window.close();
    });
  });
  
  // 修改加载顺序，先确保有默认模板，然后再加载显示
  initTemplates();
  
  // 管理模板按钮点击事件
  document.getElementById("manageTemplatesBtn").addEventListener("click", () => {
    // 打开模板管理页面
    chrome.tabs.create({ url: chrome.runtime.getURL("templates.html") });
  });
  
  // 创建模板按钮点击事件
  document.getElementById("createTemplateBtn").addEventListener("click", () => {
    // 创建一个更友好的模板创建界面
    const formHtml = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:5px;font-weight:bold;">模板名称:</label>
          <input type="text" id="new-template-name" style="width:100%;padding:5px;" placeholder="输入模板名称" value="新模板">
        </div>
        <div>
          <label style="display:block;margin-bottom:5px;font-weight:bold;">模板内容:</label>
          <textarea id="new-template-content" style="width:100%;padding:5px;min-height:80px;" placeholder="输入模板内容"></textarea>
        </div>
      </div>
    `;
    
    // 创建对话框容器
    const dialogContainer = document.createElement('div');
    dialogContainer.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.5);display:flex;justify-content:center;
      align-items:center;z-index:10000;
    `;
    
    // 创建对话框
    dialogContainer.innerHTML = `
      <div style="background:white;border-radius:8px;width:300px;overflow:hidden;">
        <div style="padding:15px;background:#7c4dff;color:white;font-weight:bold;">
          创建新模板
        </div>
        <div style="padding:15px;">
          ${formHtml}
        </div>
        <div style="padding:10px 15px;display:flex;justify-content:flex-end;gap:10px;background:#f5f5f5;">
          <button id="dialog-cancel" style="padding:8px 12px;">取消</button>
          <button id="dialog-save" style="padding:8px 12px;background:#7c4dff;color:white;border:none;border-radius:4px;">保存模板</button>
        </div>
      </div>
    `;
    
    // 添加到页面
    document.body.appendChild(dialogContainer);
    
    // 绑定事件
    document.getElementById('dialog-cancel').addEventListener('click', () => {
      dialogContainer.remove();
    });
    
    document.getElementById('dialog-save').addEventListener('click', () => {
      const name = document.getElementById('new-template-name').value.trim();
      const content = document.getElementById('new-template-content').value.trim();
      
      if (!name) {
        alert('请输入模板名称');
        return;
      }
      
      if (!content) {
        alert('请输入模板内容');
        return;
      }
      
      chrome.runtime.sendMessage(
        { 
          action: "saveTemplate", 
          name: name,
          content: content
        },
        () => {
          dialogContainer.remove();
          loadTemplates(); // 刷新模板列表
        }
      );
    });
    
    // 聚焦到名称输入框
    setTimeout(() => {
      document.getElementById('new-template-name').focus();
    }, 100);
  });
  
  // 获取并显示所有备忘录站点
  function loadSavedSites() {
    // 首先尝试获取 memos 对象中的所有备忘录
    chrome.storage.local.get(null, (result) => {
      console.log("加载所有存储数据:", result);
      
      // 初始化备忘录数据对象
      let memos = result.memos || {};
      let domains = Object.keys(memos);
      
      // 同时检查是否有以 memo_ 开头的单独存储项
      const memoKeys = Object.keys(result).filter(key => key.startsWith('memo_'));
      
      // 如果找到了以 memo_ 开头的键
      if (memoKeys.length > 0) {
        // 处理这些单独存储的备忘录
        memoKeys.forEach(key => {
          const domain = key.replace('memo_', '');
          if (!memos[domain]) {
            // 如果 memos 对象中没有这个域名的数据，添加它
            memos[domain] = {
              content: result[key],
              isVisible: true,
              lastEdited: result[`lastEdited_${domain}`] || Date.now()
            };
            
            // 将域名添加到域名列表
            if (!domains.includes(domain)) {
              domains.push(domain);
            }
          }
        });
      }
      
      console.log("处理后的备忘录数据:", memos);
      console.log("发现的域名:", domains);
      
      if (!domains || domains.length === 0) {
        console.log("没有保存的备忘录");
        siteList.innerHTML = '';
        emptyList.style.display = 'block';
        return;
      }
      
      // 有数据，隐藏空列表提示
      emptyList.style.display = 'none';
      
      // 按照最后编辑时间排序（最新的在前）
      domains.sort((a, b) => {
        const timeA = memos[b].lastEdited || 0;
        const timeB = memos[a].lastEdited || 0;
        return timeA - timeB;
      });
      
      // 构建站点列表
      siteList.innerHTML = domains.map(domain => {
        const memo = memos[domain];
        const status = memo.isVisible !== false ? "显示" : "隐藏";
        const date = new Date(memo.lastEdited || Date.now()).toLocaleDateString();
        
        // 修改内容预览的处理
        let contentPreview = "(空备忘录)";
        if (memo.content && memo.content.trim()) {
          contentPreview = memo.content.replace(/<[^>]*>/g, '').trim();
          if (contentPreview.length > 30) {
            contentPreview = contentPreview.substring(0, 30) + '...';
          }
        }
        
        return `
          <li class="site-item">
            <div class="site-info">
              <div class="site-header">
                <span class="site-label">站点:</span>
                <span class="site-domain" title="${domain}">${domain}</span>
              </div>
              <div class="site-content">
                <span class="site-label">内容:</span>
                <span class="site-preview">${contentPreview}</span>
              </div>
              <span class="site-date">最后编辑: ${date}</span>
            </div>
            <div class="site-actions">
              <button class="secondary visit-site" data-domain="${domain}">访问</button>
              <button class="secondary toggle-site" data-domain="${domain}" data-visible="${memo.isVisible !== false}">
                ${memo.isVisible !== false ? '隐藏' : '显示'}
              </button>
              <button class="secondary copy-content" data-domain="${domain}" title="复制备忘录内容">复制</button>
              <button class="secondary save-template" data-domain="${domain}" title="保存为模板">保存模板</button>
              <button class="delete-site" data-domain="${domain}">删除</button>
            </div>
          </li>
        `;
      }).join('');
      
      // 添加访问站点按钮事件
      document.querySelectorAll('.visit-site').forEach(button => {
        button.addEventListener('click', () => {
          const domain = button.dataset.domain;
          chrome.tabs.create({ url: `https://${domain}` });
        });
      });
      
      // 添加切换可见性按钮事件
      document.querySelectorAll('.toggle-site').forEach(button => {
        button.addEventListener('click', () => {
          const domain = button.dataset.domain;
          const isVisible = button.dataset.visible === 'true';
          
          chrome.runtime.sendMessage(
            { 
              action: "updateMemoVisibility", 
              domain: domain, 
              isVisible: !isVisible 
            },
            () => {
              // 刷新列表
              loadSavedSites();
            }
          );
        });
      });
      
      // 添加删除按钮事件
      document.querySelectorAll('.delete-site').forEach(button => {
        button.addEventListener('click', () => {
          const domain = button.dataset.domain;
          if (confirm(`确定要删除 ${domain} 的备忘录吗？`)) {
            chrome.runtime.sendMessage(
              { 
                action: "deleteMemo", 
                domain: domain
              },
              () => {
                // 刷新列表
                loadSavedSites();
              }
            );
          }
        });
      });
      
      // 添加复制内容按钮事件
      document.querySelectorAll('.copy-content').forEach(button => {
        button.addEventListener('click', () => {
          const domain = button.dataset.domain;
          chrome.runtime.sendMessage(
            { action: "getMemo", domain: domain },
            (response) => {
              if (response.data && response.data.content) {
                // 创建临时textarea元素用于复制
                const textarea = document.createElement('textarea');
                textarea.value = response.data.content;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                
                // 显示复制成功提示
                button.textContent = "已复制!";
                setTimeout(() => {
                  button.textContent = "复制";
                }, 2000);
              }
            }
          );
        });
      });
      
      // 添加保存为模板按钮事件
      document.querySelectorAll('.save-template').forEach(button => {
        button.addEventListener('click', () => {
          const domain = button.dataset.domain;
          chrome.runtime.sendMessage(
            { action: "getMemo", domain: domain },
            (response) => {
              if (response.data && response.data.content) {
                const templateName = prompt("请输入模板名称:", domain + "的备忘录");
                if (templateName) {
                  chrome.runtime.sendMessage(
                    { 
                      action: "saveTemplate", 
                      name: templateName,
                      content: response.data.content
                    },
                    () => {
                      loadTemplates(); // 刷新模板列表
                      button.textContent = "已保存!";
                      setTimeout(() => {
                        button.textContent = "保存模板";
                      }, 2000);
                    }
                  );
                }
              }
            }
          );
        });
      });
    });
  }
  
  // 添加初始化模板函数
  function initTemplates() {
    // 直接加载已有的模板，不自动创建默认模板
    chrome.runtime.sendMessage({ action: "getAllTemplates" }, (response) => {
      const templates = response.data || {};
      console.log("初始检查模板:", templates);
      
      // 直接加载现有模板，不创建默认模板
      loadTemplates();
    });
  }
  
  // 修改模板列表函数以增强可靠性
  function loadTemplates() {
    const templateList = document.getElementById("templateList");
    const emptyTemplates = document.getElementById("emptyTemplates");
    
    chrome.runtime.sendMessage({ action: "getAllTemplates" }, (response) => {
      console.log("加载模板响应:", response);
      
      // 检查响应数据结构
      if (!response || !response.data) {
        console.error("获取模板失败或返回结构不正确:", response);
        return;
      }
      
      const templates = response.data || {};
      const templateNames = Object.keys(templates);
      console.log("获取到的模板名称:", templateNames);
      
      if (!templateNames || templateNames.length === 0) {
        console.log("没有找到模板，显示引导信息");
        templateList.innerHTML = '';
        emptyTemplates.style.display = 'block';
        return;
      }
      
      console.log("找到模板，隐藏引导信息");
      emptyTemplates.style.display = 'none';
      templateList.style.display = 'block';
      
      // 构建模板列表
      templateList.innerHTML = templateNames.map(name => {
        const template = templates[name];
        let contentPreview = template.content.replace(/<[^>]*>/g, '').trim();
        if (contentPreview.length > 30) {
          contentPreview = contentPreview.substring(0, 30) + '...';
        }
        
        return `
          <div class="template-item">
            <div class="template-info">
              <span class="template-name">${name}</span>
              <span class="template-preview">${contentPreview}</span>
            </div>
            <div class="template-actions">
              <button class="secondary use-template" data-template="${name}">使用</button>
            </div>
          </div>
        `;
      }).join('');
      
      // 添加使用模板按钮事件
      document.querySelectorAll('.use-template').forEach(button => {
        button.addEventListener('click', () => {
          const templateName = button.dataset.template;
          
          // 获取当前选项卡并应用模板
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const currentTab = tabs[0];
            chrome.runtime.sendMessage(
              { 
                action: "getTemplate", 
                name: templateName 
              },
              (response) => {
                if (response.data) {
                  chrome.tabs.sendMessage(currentTab.id, {
                    action: "applyTemplate",
                    content: response.data.content
                  });
                  // 关闭弹出窗口
                  window.close();
                }
              }
            );
          });
        });
      });
    });
  }
  
  // 添加刷新按钮事件
  document.getElementById("refreshTemplatesBtn").addEventListener("click", () => {
    loadTemplates();
  });
  
  // 添加一个用于检查和重置模板的工具函数
  function resetAndCheckTemplates() {
    // 先清空现有模板
    chrome.storage.local.set({ templates: {} }, () => {
      console.log("已清空模板存储");
      
      // 添加一个新的测试模板
      chrome.runtime.sendMessage(
        { 
          action: "saveTemplate", 
          name: "测试模板",
          content: "<p>这是一个测试模板</p>"
        },
        (response) => {
          console.log("保存测试模板响应:", response);
          
          // 验证模板是否保存成功
          chrome.runtime.sendMessage({ action: "getAllTemplates" }, (response) => {
            console.log("验证模板存储:", response);
            loadTemplates(); // 重新加载模板列表
          });
        }
      );
    });
  }
  
  // 立即执行函数，强制重置并显示一个测试模板
  (function() {
    // 延迟2秒执行，确保其他代码已完成
    setTimeout(() => {
      // 调用重置函数
      resetAndCheckTemplates();
      
      // 强制显示模板列表区域
      const templateList = document.getElementById("templateList");
      templateList.style.cssText = "display:block; border:2px solid #7c4dff; min-height:50px; margin-top:10px; padding:5px; background:#fff;";
      
      // 添加直接可见的测试模板
      templateList.innerHTML = `
        <div class="template-item" style="padding:10px; display:flex; justify-content:space-between; background:#f8f8ff; border-radius:5px;">
          <div class="template-info">
            <span class="template-name" style="font-weight:bold; color:#7c4dff;">测试模板</span>
            <span class="template-preview" style="font-style:italic; color:#666;">这是一个测试模板</span>
          </div>
          <div class="template-actions">
            <button class="secondary use-template" data-template="测试模板">使用</button>
          </div>
        </div>
      `;
      
      // 绑定使用按钮事件
      document.querySelectorAll('.use-template').forEach(button => {
        button.addEventListener('click', () => {
          const templateName = button.dataset.template;
          alert("已选择模板: " + templateName);
          
          // 获取当前选项卡并应用模板
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const currentTab = tabs[0];
            chrome.tabs.sendMessage(currentTab.id, {
              action: "applyTemplate",
              content: "<p>这是一个测试模板</p>"
            });
            // 关闭弹出窗口
            window.close();
          });
        });
      });
      
      // 隐藏引导信息
      document.getElementById("emptyTemplates").style.display = "none";
    }, 500);
  })();
  
  // 在DOMContentLoaded事件处理函数内，添加这段代码来处理硬编码的模板按钮
  // 为硬编码模板的使用按钮添加事件
  document.querySelectorAll('.use-template-static').forEach(button => {
    button.addEventListener('click', () => {
      const content = button.dataset.content;
      
      // 获取当前选项卡并应用模板
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0];
        chrome.tabs.sendMessage(currentTab.id, {
          action: "applyTemplate",
          content: content
        });
        // 关闭弹出窗口
        window.close();
      });
    });
  });
  
  // 加载快速模板选择器
  loadQuickTemplates();
  
  // 添加新的快速模板加载函数 - 使用 Chrome Storage API
  function loadQuickTemplates() {
    const selector = document.getElementById("quickTemplateSelector");
    
    // 使用 Chrome Storage 获取模板
    chrome.storage.sync.get(['memoTemplates'], (result) => {
      const templates = result.memoTemplates || {};
      const templateNames = Object.keys(templates);
      
      // 清空现有选项（保留第一个默认选项）
      while (selector.options.length > 1) {
        selector.remove(1);
      }
      
      // 添加模板选项
      templateNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selector.appendChild(option);
      });
      
      // 绑定应用按钮事件
      document.getElementById("applyQuickTemplate").addEventListener("click", () => {
        const selectedTemplate = selector.value;
        if (!selectedTemplate) {
          alert("请先选择一个模板");
          return;
        }
        
        // 获取模板内容
        if (templates[selectedTemplate]) {
          const content = templates[selectedTemplate].content;
          
          // 应用到当前页面
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const currentTab = tabs[0];
            chrome.tabs.sendMessage(currentTab.id, {
              action: "applyTemplate",
              content: content
            });
            window.close();
          });
        }
      });
    });
  }
  
  // 导出数据函数
  function exportData() {
    console.log("导出按钮被点击");
    chrome.storage.local.get(null, (data) => {
      console.log("获取到所有存储数据:", data);
      
      // 获取集中存储的备忘录数据
      const memos = data.memos || {};
      const templates = data.templates || {};
      
      // 收集位置数据
      const positions = {};
      
      // 单独存储的旧格式备忘录数据
      const singleMemos = {};
      let hasOldFormatMemos = false;
      
      // 遍历所有存储项
      for (const key in data) {
        // 收集位置数据
        if (key.startsWith('position_')) {
          positions[key] = data[key];
        }
        
        // 收集旧格式的备忘录数据
        if (key.startsWith('memo_')) {
          const domain = key.replace('memo_', '');
          singleMemos[domain] = {
            content: data[key],
            isVisible: true,
            lastEdited: data[`lastEdited_${domain}`] || Date.now()
          };
          hasOldFormatMemos = true;
          console.log("发现旧格式备忘录:", domain);
        }
      }
      
      // 合并两种格式的备忘录数据
      const combinedMemos = {...memos};
      if (hasOldFormatMemos) {
        Object.assign(combinedMemos, singleMemos);
      }
      
      // 检查是否存在可导出的数据
      const hasMemos = Object.keys(combinedMemos).length > 0;
      const hasTemplates = Object.keys(templates).length > 0;
      const hasPositions = Object.keys(positions).length > 0;
      
      console.log("数据检查结果:", {
        hasMemos: hasMemos,
        memoCount: Object.keys(combinedMemos).length,
        hasTemplates: hasTemplates,
        templateCount: Object.keys(templates).length,
        hasPositions: hasPositions,
        positionCount: Object.keys(positions).length
      });
      
      // 如果没有任何数据，显示提示并返回
      if (!hasMemos && !hasTemplates && !hasPositions) {
        showToast("没有可导出的数据！请先创建备忘录或模板。", "warning");
        return;
      }
      
      // 准备导出数据
      const exportData = {
        memos: combinedMemos,
        templates: templates,
        positions: positions
      };
      
      // 添加导出元数据
      exportData.meta = {
        exportDate: new Date().toISOString(),
        version: "1.3",
        dataFormat: hasOldFormatMemos ? "mixed" : "standard"
      };
      
      // 设置文件名，包含日期
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `chrome_memo_backup_${date}.json`;
      
      // 创建Blob并下载
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a); // 确保元素添加到DOM
      a.click();
      document.body.removeChild(a); // 清理DOM
      
      // 清理URL对象
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      // 显示成功提示
      showToast(`数据导出成功！共导出${Object.keys(combinedMemos).length}个备忘录。`);
    });
  }
  
  // 导入数据函数
  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log("开始读取文件:", file.name);
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        console.log("文件读取成功，开始解析");
        const data = JSON.parse(e.target.result);
        
        // 扩展数据验证
        if (!data || (typeof data !== 'object')) {
          throw new Error("导入的文件格式不正确");
        }
        
        // 验证数据是否包含必要的字段
        if (!data.memos && !data.templates && !data.positions) {
          throw new Error("导入文件不包含有效的备忘录数据");
        }
        
        console.log("导入数据验证通过:", {
          memos: data.memos ? Object.keys(data.memos).length : 0, 
          templates: data.templates ? Object.keys(data.templates).length : 0,
          positions: data.positions ? Object.keys(data.positions).length : 0
        });
        
        // 确认导入
        showDialog({
          title: "确认导入",
          message: "确定要导入这些数据吗？这将覆盖当前的数据。",
          type: "confirm",
          onConfirm: () => {
            console.log("用户确认导入，开始保存数据");
            
            // 使用Promise处理异步存储操作
            const savePromises = [];
            
            // 保存备忘录数据
            if (data.memos) {
              savePromises.push(new Promise((resolve) => {
                chrome.storage.local.set({ memos: data.memos }, () => {
                  console.log("备忘录数据保存完成");
                  resolve();
                });
              }));
            }
            
            // 保存模板数据
            if (data.templates) {
              savePromises.push(new Promise((resolve) => {
                chrome.storage.local.set({ templates: data.templates }, () => {
                  console.log("模板数据保存完成");
                  resolve();
                });
              }));
            }
            
            // 保存位置数据
            if (data.positions) {
              const positionPromises = Object.keys(data.positions).map(key => {
                return new Promise((resolve) => {
                  const obj = {};
                  obj[key] = data.positions[key];
                  chrome.storage.local.set(obj, () => {
                    console.log(`位置数据保存完成: ${key}`);
                    resolve();
                  });
                });
              });
              savePromises.push(...positionPromises);
            }
            
            // 等待所有存储操作完成
            Promise.all(savePromises).then(() => {
              console.log("所有数据保存完成");
              
              // 验证数据是否正确保存
              chrome.storage.local.get(null, (result) => {
                console.log("验证保存结果:", {
                  memos: result.memos ? Object.keys(result.memos).length : 0,
                  templates: result.templates ? Object.keys(result.templates).length : 0
                });
                
                // 显示成功提示
                showToast("数据导入成功！", "success");
                
                // 刷新页面显示
                loadSavedSites();
                loadTemplates();
                
                // 显示弹窗确认导入成功
                showDialog({
                  title: "扩展程序网站备忘录提示",
                  message: "数据导入成功！",
                  type: "success",
                  data: {
                    "备忘录": `${result.memos ? Object.keys(result.memos).length : 0}个`,
                    "模板": `${result.templates ? Object.keys(result.templates).length : 0}个`
                  }
                });
              });
            }).catch(err => {
              console.error("保存数据时出错:", err);
              showToast("导入过程中出错: " + err.message, "error");
            });
          }
        });
      } catch (error) {
        console.error("导入解析失败:", error);
        showToast("导入失败: " + error.message, "error");
      }
      
      // 重置文件输入，允许重复选择同一文件
      document.getElementById("fileInput").value = "";
    };
    
    reader.onerror = function() {
      console.error("文件读取失败");
      showToast("文件读取失败", "error");
    };
    
    reader.readAsText(file);
  }
  
  // 增强版提示信息 - 支持不同类型的提示
  function showToast(message, type = "success") {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.textContent = message;
    
    // 根据类型设置不同样式
    let backgroundColor = "rgba(0, 0, 0, 0.7)";
    if (type === "warning") {
      backgroundColor = "rgba(255, 153, 0, 0.9)";
    } else if (type === "error") {
      backgroundColor = "rgba(255, 59, 48, 0.9)";
    }
    
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${backgroundColor};
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      transition: opacity 0.3s, transform 0.3s;
      opacity: 0;
    `;
    
    document.body.appendChild(toast);
    
    // 显示提示
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    }, 10);
    
    // 3秒后隐藏
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(20px)";
      
      // 动画结束后移除元素
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // 通用对话框组件
  function showDialog({ 
    title = "提示", 
    message = "", 
    type = "info", // info, success, warning, confirm
    data = null,
    onConfirm = null,
    onCancel = null
  }) {
    // 创建对话框容器
    const dialogOverlay = document.createElement('div');
    dialogOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    // 创建对话框内容
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 20px;
      width: 280px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      animation: dialogSlideIn 0.3s ease-out;
    `;

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dialogSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    // 获取图标和颜色
    let icon = '';
    let color = '#7c4dff';
    switch (type) {
      case 'success':
        icon = '<polyline points="20 6 9 17 4 12"></polyline>';
        color = '#4CAF50';
        break;
      case 'warning':
        icon = '<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>';
        color = '#FF9800';
        break;
      case 'confirm':
        icon = '<path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        color = '#7c4dff';
        break;
      default:
        icon = '<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        color = '#2196F3';
    }

    // 设置对话框内容
    dialog.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="
          background: ${color};
          width: 48px;
          height: 48px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            ${icon}
          </svg>
        </div>
        <h2 style="
          margin: 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
        ">${title}</h2>
        <p style="
          margin: 8px 0 0;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        ">${message}</p>
      </div>
      ${data ? `
        <div style="
          background: #f5f5f5;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
        ">
          ${Object.entries(data).map(([key, value]) => `
            <div style="
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 14px;
            ">
              <span style="color: #666;">${key}:</span>
              <span style="color: ${color}; font-weight: 600;">${value}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div style="
        display: flex;
        gap: 10px;
        ${type === 'confirm' ? 'justify-content: space-between' : 'justify-content: center'}
      ">
        ${type === 'confirm' ? `
          <button class="cancel-btn" style="
            flex: 1;
            padding: 10px;
            background: #f5f5f5;
            color: #666;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          ">取消</button>
        ` : ''}
        <button class="confirm-btn" style="
          flex: 1;
          padding: 10px;
          background: ${color};
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        ">${type === 'confirm' ? '确定' : '知道了'}</button>
      </div>
    `;

    // 绑定按钮事件
    const confirmBtn = dialog.querySelector('.confirm-btn');
    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.filter = 'brightness(0.9)';
      confirmBtn.style.transform = 'translateY(-1px)';
    });
    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.filter = 'none';
      confirmBtn.style.transform = 'none';
    });
    confirmBtn.addEventListener('click', () => {
      if (onConfirm) onConfirm();
      dialogOverlay.remove();
      style.remove();
    });

    const cancelBtn = dialog.querySelector('.cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = '#e0e0e0';
        cancelBtn.style.transform = 'translateY(-1px)';
      });
      cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = '#f5f5f5';
        cancelBtn.style.transform = 'none';
      });
      cancelBtn.addEventListener('click', () => {
        if (onCancel) onCancel();
        dialogOverlay.remove();
        style.remove();
      });
    }

    // 添加点击背景关闭的功能（仅对非确认类型的对话框）
    if (type !== 'confirm') {
      dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
          dialogOverlay.remove();
          style.remove();
        }
      });
    }

    // 将对话框添加到页面
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
  }
}); 