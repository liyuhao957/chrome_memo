document.addEventListener("DOMContentLoaded", () => {
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
    chrome.runtime.sendMessage({ action: "getAllMemos" }, (response) => {
      console.log("加载站点列表:", response);
      const memos = response.data || {};
      const domains = Object.keys(memos);
      
      if (!domains || domains.length === 0) {
        console.log("没有保存的备忘录");
        siteList.innerHTML = '';
        emptyList.style.display = 'block';
        return;
      }
      
      console.log("发现备忘录域名:", domains);
      emptyList.style.display = 'none';
      
      // 按照最后编辑时间排序（最新的在前）
      domains.sort((a, b) => memos[b].lastEdited - memos[a].lastEdited);
      
      // 构建站点列表，添加复制内容按钮
      siteList.innerHTML = domains.map(domain => {
        const memo = memos[domain];
        const status = memo.isVisible ? "显示" : "隐藏";
        const date = new Date(memo.lastEdited).toLocaleDateString();
        
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
              <button class="secondary toggle-site" data-domain="${domain}" data-visible="${memo.isVisible}">
                ${memo.isVisible ? '隐藏' : '显示'}
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
    // 先检查是否有模板，如果没有则创建默认模板
    chrome.runtime.sendMessage({ action: "getAllTemplates" }, (response) => {
      const templates = response.data || {};
      console.log("初始检查模板:", templates);
      
      if (Object.keys(templates).length === 0) {
        // 创建一个默认模板
        chrome.runtime.sendMessage(
          { 
            action: "saveTemplate", 
            name: "常用回复",
            content: "<p>请问</p>"
          },
          () => {
            console.log("已创建默认模板");
            // 创建默认模板后再加载模板列表
            loadTemplates();
          }
        );
      } else {
        // 已有模板，直接加载
        loadTemplates();
      }
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
}); 