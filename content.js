// 备忘录容器和编辑器容器的引用
let memoContainer = null;
let editorContainer = null;
let dragSrcEl = null;
let selectionPopup = null; // 新增：选中文本时显示的弹出菜单
let isQuickAddEnabled = true; // 默认启用

// 添加多重事件监听，确保备忘录显示
document.addEventListener('DOMContentLoaded', loadMemo);

// 添加延迟加载作为备份方案
window.addEventListener('load', () => {
  setTimeout(loadMemo, 500);
});

// 加载备忘录的公共函数
function loadMemo() {
  const domain = window.location.hostname;
  
  // 避免重复加载，如果备忘录已经显示则跳过
  if (memoContainer && memoContainer.style.display !== "none") {
    return;
  }
  
  // 查询该域名的备忘录
  chrome.runtime.sendMessage(
    { action: "getMemo", domain: domain },
    (response) => {
      console.log("页面加载时获取备忘录:", response);
      if (response.data && response.data.isVisible) {
        createMemoElement(response.data.content);
      }
    }
  );
}

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const domain = window.location.hostname;
  
  if (message.action === "openEditor") {
    // 获取现有备忘录内容并打开编辑器
    chrome.runtime.sendMessage(
      { action: "getMemo", domain: domain },
      (response) => {
        const content = response.data ? response.data.content : "";
        openEditor(content);
      }
    );
  } else if (message.action === "toggleMemo") {
    // 显示/隐藏备忘录
    if (memoContainer) {
      const isVisible = memoContainer.style.display !== "none";
      memoContainer.style.display = isVisible ? "none" : "block";
      
      // 同时控制悬浮图标的显示状态
      const floatingIcon = document.querySelector('.chrome-memo-floating-icon');
      if (floatingIcon) {
        floatingIcon.style.display = isVisible ? "none" : "block";
      }
      
      // 更新存储中的可见性状态
      chrome.runtime.sendMessage({
        action: "updateMemoVisibility",
        domain: domain,
        isVisible: !isVisible
      });
    } else {
      // 如果容器不存在但有备忘录，则创建并显示
      chrome.runtime.sendMessage(
        { action: "getMemo", domain: domain },
        (response) => {
          if (response.data) {
            createMemoElement(response.data.content);
            
            // 更新存储中的可见性状态
            chrome.runtime.sendMessage({
              action: "updateMemoVisibility",
              domain: domain,
              isVisible: true
            });
          }
        }
      );
    }
  } else if (message.action === "applyTemplate") {
    // 应用模板内容
    openEditor(message.content);
  } else if (message.action === "updateQuickAddSetting") {
    isQuickAddEnabled = message.isEnabled;
    if (!isQuickAddEnabled && selectionPopup) {
      selectionPopup.style.display = 'none';
    }
  } else if (message.action === "closeMemo") {
    // 如果备忘录容器存在，则移除它
    if (memoContainer) {
      memoContainer.remove();
      memoContainer = null;
    }
  }
});

// 添加检测内容是否为空的辅助函数
function isEmptyContent(content) {
  if (!content) return true;
  
  // 去除所有HTML标签后检查是否为空
  const textOnly = content.replace(/<[^>]*>/g, '').trim();
  return textOnly === '';
}

// 创建备忘录元素
function createMemoElement(content) {
  console.log("创建备忘录元素，内容:", content);
  
  // 增强空内容检查
  if (isEmptyContent(content)) {
    console.log("备忘录内容为空或只有HTML标签，不显示");
    return;
  }
  
  // 获取当前域名
  const currentDomain = window.location.hostname;
  
  // 如果已存在，则先移除
  if (memoContainer) {
    memoContainer.remove();
  }
  
  // 创建新的备忘录容器
  memoContainer = document.createElement("div");
  memoContainer.className = "chrome-memo-container";

  // 从存储中获取保存的位置
  chrome.storage.local.get([`position_${currentDomain}`], (result) => {
    const savedPosition = result[`position_${currentDomain}`];
    if (savedPosition) {
      // 应用保存的位置
      Object.assign(memoContainer.style, savedPosition);
    } else {
      // 使用默认位置
      memoContainer.style.right = "20px";
      memoContainer.style.bottom = "20px";
    }

    // 添加到页面
    document.body.appendChild(memoContainer);

    // 初始化拖动功能
    makeDraggable(memoContainer);
  });
  
  // 标题中显示当前站点域名，添加编辑按钮，移除title属性
  memoContainer.innerHTML = `
    <div class="chrome-memo-header">
      <span>备忘录</span>
      <div class="chrome-memo-header-actions">
        <button class="chrome-memo-copy" title="复制备忘录内容">📋</button>
        <button class="chrome-memo-template" title="保存为模板">📑</button>
        <button class="chrome-memo-reset-position" title="恢复默认位置">📍</button>
        <button class="chrome-memo-shortcuts" title="查看快捷键">⌨️</button>
        <button class="chrome-memo-close" title="关闭备忘录">×</button>
      </div>
    </div>
    <div class="chrome-memo-site-indicator">当前站点：${currentDomain}</div>
    <div class="chrome-memo-content-wrapper" style="position: relative;">
      <div class="chrome-memo-content" style="
        padding: 16px;
        max-height: 250px;
        overflow-y: auto;
        line-height: 1.6;
        color: #333;
        font-size: 14px;
        scrollbar-width: thin;
        scrollbar-color: #d4d4d4 #f5f5f5;
        padding-bottom: 40px; /* 为固定提示留出空间 */
      ">
        <div class="chrome-memo-actual-content">
          ${content}
        </div>
      </div>
      <!-- 使用固定定位，确保始终在底部 -->
      <div class="chrome-memo-edit-tip" style="
        position: absolute;
        bottom: 0;
        right: 0;
        left: 0;
        text-align: right;
        padding: 8px 16px;
        background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1) 50%);
        height: 40px; /* 固定高度 */
        pointer-events: none; /* 允许点击穿透 */
        z-index: 100;
      ">
        <a href="#" class="chrome-memo-edit-link" style="
          color: #8344ff;
          font-size: 12px;
          text-decoration: none;
          padding: 3px 6px;
          border-radius: 4px;
          transition: all 0.2s;
          pointer-events: auto; /* 确保链接可点击 */
        ">双击编辑</a>
      </div>
    </div>
  `;
  
  // 修改点击编辑链接事件
  memoContainer.querySelector(".chrome-memo-edit-link").addEventListener("click", (e) => {
    e.preventDefault();
    // 只获取实际内容部分
    const content = memoContainer.querySelector(".chrome-memo-actual-content").innerHTML;
    openEditor(content);
  });
  
  // 修改备忘录内容区域的事件为双击触发
  memoContainer.querySelector(".chrome-memo-actual-content").addEventListener("dblclick", () => {
    const content = memoContainer.querySelector(".chrome-memo-actual-content").innerHTML;
    openEditor(content);
  });
  
  // 移除单击事件 (如果有的话)
  memoContainer.querySelector(".chrome-memo-actual-content").removeEventListener("click", () => {
    const content = memoContainer.querySelector(".chrome-memo-actual-content").innerHTML;
    openEditor(content);
  });
  
  // 修改关闭按钮的事件处理
  memoContainer.querySelector(".chrome-memo-close").addEventListener("click", () => {
    // 先获取备忘录的位置信息
    const rect = memoContainer.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    
    // 创建并显示悬浮图标
    const floatingIcon = document.createElement('div');
    floatingIcon.className = 'chrome-memo-floating-icon';
    floatingIcon.innerHTML = `
      <div class="floating-icon-inner">
        <span>📝</span>
        <div class="floating-icon-tooltip">点击展开备忘录</div>
      </div>
    `;
    
    // 设置悬浮图标的位置
    floatingIcon.style.left = (rect.left + scrollX) + 'px';
    floatingIcon.style.top = (rect.top + scrollY) + 'px';
    
    // 先添加到页面
    document.body.appendChild(floatingIcon);
    
    // 使悬浮图标可拖动
    makeDraggable(floatingIcon);
    
    // 添加点击事件以恢复备忘录
    const handleClick = (e) => {
      // 如果正在拖动，不触发点击事件
      if (floatingIcon.classList.contains('chrome-memo-dragging')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // 先移除最小化类
      memoContainer.classList.remove('memo-minimized');
      
      // 设置备忘录位置和显示属性
      const iconRect = floatingIcon.getBoundingClientRect();
      memoContainer.style.left = iconRect.left + 'px';
      memoContainer.style.top = iconRect.top + 'px';
      memoContainer.style.right = 'auto';
      memoContainer.style.bottom = 'auto';
      
      // 确保备忘录可见
      memoContainer.style.display = 'block';
      memoContainer.style.visibility = 'visible';
      memoContainer.style.opacity = '1';
      memoContainer.style.pointerEvents = 'auto';
      
      // 移除悬浮图标
      floatingIcon.remove();
      
      // 更新存储中的可见性状态
      chrome.runtime.sendMessage({
        action: "updateMemoVisibility",
        domain: window.location.hostname,
        isVisible: true
      });
    };
    
    // 为悬浮图标添加点击事件
    floatingIcon.addEventListener('click', handleClick);
    
    // 最后才隐藏备忘录
    memoContainer.classList.add('memo-minimized');
  });

  // 添加复制按钮的事件监听
  memoContainer.querySelector(".chrome-memo-copy").addEventListener("click", () => {
    // 创建一个临时的textarea元素
    const textarea = document.createElement('textarea');
    textarea.value = content.replace(/<[^>]*>/g, '').trim(); // 复制纯文本内容
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // 显示复制成功的提示
    const copyBtn = memoContainer.querySelector(".chrome-memo-copy");
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "✓";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 1500);
  });

  // 添加模板按钮的点击事件（保存模板）
  const templateBtn = memoContainer.querySelector(".chrome-memo-template");
  
  // 左键点击保存模板
  templateBtn.addEventListener("click", () => {
    const contentText = memoContainer.querySelector(".chrome-memo-content").innerHTML;
    
    chrome.storage.local.get(['templates'], (result) => {
      const templates = result.templates || {};
      let defaultName = `${currentDomain}的备忘录`;
      
      const templateName = prompt("请输入模板名称 (如果使用已有模板名称将会更新该模板):", defaultName);
      
      if (templateName) {
        // 获取当前最大的 order 值
        const maxOrder = Object.values(templates).reduce((max, template) => {
          return Math.max(max, template.order ?? -1);
        }, -1);
        
        // 更新或创建模板，设置 order 为最大值 + 1
        templates[templateName] = {
          content: contentText,
          createdAt: Date.now(),
          domain: currentDomain,
          order: maxOrder + 1  // 添加 order 字段
        };
        
        chrome.storage.local.set({ templates }, () => {
          console.log("模板已保存/更新到 Chrome Storage", {
            name: templateName,
            content: contentText,
            updateTime: new Date().toLocaleString(),
            source: "从当前备忘录内容获取",
            order: maxOrder + 1
          });
          
          // 显示成功提示
          const originalText = templateBtn.textContent;
          templateBtn.textContent = "✓";
          setTimeout(() => {
            templateBtn.textContent = originalText;
          }, 1500);
          
          alert(`模板"${templateName}"已保存成功！`);
        });
      }
    });
  });

  // 修改右键菜单事件处理中的菜单创建部分
  templateBtn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    
    // 先移除页面上已存在的所有模板菜单
    document.querySelectorAll('.chrome-memo-template-menu').forEach(menu => {
      menu.remove();
    });
    
    chrome.storage.local.get(['templates'], (result) => {
      const templates = result.templates || {};
      
      // 将模板转换为数组并按照存储的顺序排序
      const sortedTemplates = Object.entries(templates)
        .sort((a, b) => {
          // 使用 order 字段进行排序，如果不存在则使用创建时间
          const orderA = a[1].order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b[1].order ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
      
      // 从排序后的数组中获取模板名称
      const templateNames = sortedTemplates.map(entry => entry[0]);
      
      if (templateNames.length === 0) {
        alert('暂无可删除的模板');
        return;
      }
      
      // 创建模板删除菜单
      const menu = document.createElement('div');
      menu.className = 'chrome-memo-template-menu';
      
      menu.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        padding: 8px 0;
        z-index: 2147483647;
        min-width: 200px;
        max-height: 400px;
        display: flex;
        flex-direction: column;
      `;
      
      // 添加菜单标题和搜索框
      menu.innerHTML = `
        <div style="padding: 4px 12px; color: #666; font-size: 12px; border-bottom: 1px solid #eee;">删除模板</div>
        <div style="padding: 8px 12px; border-bottom: 1px solid #eee;">
          <input type="text" class="template-search" placeholder="搜索模板..." style="
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 12px;
            outline: none;
          ">
        </div>
        <div class="template-list" style="
          overflow-y: auto;
          max-height: 300px;
          padding: 4px 0;
        "></div>
      `;
      
      // 获取模板列表容器
      const templateList = menu.querySelector('.template-list');
      
      // 创建渲染模板列表的函数
      function renderTemplates(filterText = '') {
        const filteredNames = templateNames.filter(name => 
          name.toLowerCase().includes(filterText.toLowerCase())
        );
        
        templateList.innerHTML = filteredNames.length ? '' : `
          <div style="padding: 8px 12px; color: #999; font-style: italic;">
            未找到匹配的模板
          </div>
        `;
        
        // 先移除之前的 dragend 事件监听器
        templateList.removeEventListener('dragend', handleDragEnd);
        
        filteredNames.forEach(name => {
          const item = document.createElement('div');
          item.style.cssText = `
            padding: 8px 12px;
            cursor: move; /* 指示可拖动 */
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #333;
            user-select: none; /* 防止拖动时选中文本 */
            border-bottom: 1px solid #eee;
          `;
          item.setAttribute('draggable', 'true'); // 启用拖动
          item.dataset.name = name; // 存储模板名称
          
          // 修改模板项的HTML，使用垃圾桶图标代替删除按钮
          item.innerHTML = `
            <span>⋮⋮ ${name}</span>
            <button class="template-delete-btn" data-name="${name}" style="
              background: none;
              border: none;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 4px;
              cursor: pointer;
              transition: all 0.2s;
            ">
              <span style="font-size: 16px; color: #ff6b6b;">🗑️</span>
            </button>
          `;
          
          // 拖拽相关事件
          item.addEventListener('dragstart', (e) => {
            item.classList.add('dragging');
            e.dataTransfer.setData('text/plain', name);
          });
          
          item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
          });
          
          item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingItem = templateList.querySelector('.dragging');
            if (draggingItem && draggingItem !== item) {
              const rect = item.getBoundingClientRect();
              const offset = e.clientY - rect.top - rect.height / 2;
              
              if (offset < 0) {
                item.parentNode.insertBefore(draggingItem, item);
              } else {
                item.parentNode.insertBefore(draggingItem, item.nextSibling);
              }
            }
          });
          
          // 保持原有的点击删除功能，但使用新按钮
          const deleteBtn = item.querySelector('.template-delete-btn');
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发拖动
            if (confirm(`确定要删除模板"${name}"吗？`)) {
              delete templates[name];
              chrome.storage.local.set({ templates }, () => {
                menu.remove();
                alert(`模板"${name}"已删除`);
              });
            }
          });
          
          // 添加悬停效果
          deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.backgroundColor = '#ffecec';
          });
          
          deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.backgroundColor = 'transparent';
          });
          
          templateList.appendChild(item);
        });

        // 将 dragend 处理函数定义在外部
        function handleDragEnd() {
          const newOrder = Array.from(templateList.children)
            .filter(item => item.dataset.name)
            .map(item => item.dataset.name);
          
          chrome.storage.local.get(['templates'], (result) => {
            const templates = result.templates || {};
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
        
        // 只绑定一次 dragend 事件
        templateList.addEventListener('dragend', handleDragEnd);
      }
      
      // 初始渲染所有模板
      renderTemplates();
      
      // 添加搜索功能
      const searchInput = menu.querySelector('.template-search');
      searchInput.addEventListener('input', (e) => {
        renderTemplates(e.target.value);
      });
      
      // 智能定位菜单
      const MENU_HEIGHT = 400; // 菜单预估高度
      const MENU_WIDTH = 200;  // 菜单预估宽度
      
      // 检查底部空间
      if (window.innerHeight - e.clientY < MENU_HEIGHT) {
        // 底部空间不足，向上展开
        menu.style.bottom = (window.innerHeight - e.clientY) + 'px';
        menu.style.top = 'auto';
      } else {
        // 底部空间充足，向下展开
        menu.style.top = e.clientY + 'px';
        menu.style.bottom = 'auto';
      }
      
      // 检查右侧空间
      if (window.innerWidth - e.clientX < MENU_WIDTH) {
        // 右侧空间不足，向左展开
        menu.style.right = (window.innerWidth - e.clientX) + 'px';
        menu.style.left = 'auto';
      } else {
        // 右侧空间充足，向右展开
        menu.style.left = e.clientX + 'px';
        menu.style.right = 'auto';
      }
      
      // 将菜单添加到body
      document.body.appendChild(menu);
      
      // 搜索框自动获得焦点
      setTimeout(() => searchInput.focus(), 0);
      
      // 完全替换之前的关闭逻辑，使用更可靠的方式
      // 使用捕获阶段监听（比冒泡更早触发），确保能捕获所有点击
      document.addEventListener('mousedown', function closeMenuHandler(event) {
        // 检查点击是否在菜单外部
        const isOutsideMenu = !menu.contains(event.target);
        const isNotTemplateBtn = event.target !== templateBtn;
        
        // 如果点击在菜单外，且不是模板按钮本身
        if (isOutsideMenu && isNotTemplateBtn) {
          menu.remove();
          document.removeEventListener('mousedown', closeMenuHandler, true);
        }
      }, true); // true表示在捕获阶段处理，优先于其他点击事件
      
      // 在菜单内的删除操作后直接关闭菜单
      const deleteButtons = menu.querySelectorAll('.template-delete-btn');
      deleteButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          // 删除操作后不需要额外的用户确认来关闭菜单
          setTimeout(() => menu.remove(), 0);
        });
      });
    });
  });

  // 添加恢复位置按钮的事件处理
  memoContainer.querySelector(".chrome-memo-reset-position").addEventListener("click", () => {
    // 设置默认位置
    memoContainer.style.left = "auto";
    memoContainer.style.top = "auto";
    memoContainer.style.right = "20px";
    memoContainer.style.bottom = "20px";
    
    // 保存默认位置到存储
    chrome.storage.local.set({
      [`position_${currentDomain}`]: {
        left: "auto",
        top: "auto",
        right: "20px",
        bottom: "20px"
      }
    });
  });

  // 修改备忘录内容查看页面中的提示文本
  memoContainer.querySelector(".chrome-memo-edit-link").textContent = "双击编辑";

  // 修改悬停提示内容
  memoContainer.querySelector(".chrome-memo-content").style.setProperty("--hover-text", "'双击编辑'");

  // 添加快捷键提示按钮的事件处理
  memoContainer.querySelector(".chrome-memo-shortcuts").addEventListener("click", () => {
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const shortcuts = {
      toggle: isMac ? "⌥ M" : "Alt + M",
      edit: isMac ? "⌥ E" : "Alt + E",
      quickAdd: isMac ? "⌥ Q" : "Alt + Q"
    };

    const shortcutDialog = document.createElement('div');
    shortcutDialog.className = 'chrome-memo-shortcut-dialog';
    shortcutDialog.innerHTML = `
      <div class="shortcut-dialog-content">
        <h3>快捷键指南</h3>
        <div class="shortcut-item">
          <span>显示/隐藏备忘录:</span>
          <kbd>${shortcuts.toggle}</kbd>
        </div>
        <div class="shortcut-item">
          <span>打开编辑器:</span>
          <kbd>${shortcuts.edit}</kbd>
        </div>
        <div class="shortcut-item">
          <span>开启/关闭选中文本添加:</span>
          <kbd>${shortcuts.quickAdd}</kbd>
        </div>
        <button class="shortcut-close-btn">关闭</button>
      </div>
    `;

    document.body.appendChild(shortcutDialog);

    // 添加关闭事件
    const closeBtn = shortcutDialog.querySelector('.shortcut-close-btn');
    closeBtn.addEventListener('click', () => {
      shortcutDialog.remove();
    });

    // 点击对话框外部关闭
    shortcutDialog.addEventListener('click', (e) => {
      if (e.target === shortcutDialog) {
        shortcutDialog.remove();
      }
    });
  });

  console.log("备忘录已成功创建并显示");
}

// 添加新函数，使元素可拖动 - 修复版
function makeDraggable(element) {
  if (!element) return;
  
  // 确定拖动句柄
  const dragHandle = element.classList.contains('chrome-memo-floating-icon') ? 
                    element : // 如果是悬浮图标，整个元素可拖动
                    element.querySelector(".chrome-memo-header"); // 备忘录只有标题栏可拖动
  
  if (!dragHandle) return;
  
  let isDragging = false;
  let startX, startY;
  let elementX, elementY;
  
  const mousedownHandler = function(e) {
    // 如果是备忘录且点击的是按钮，则不拖动
    if (!element.classList.contains('chrome-memo-floating-icon') && e.target.tagName === "BUTTON") return;
    
    e.preventDefault();
    isDragging = false; // 初始设置为 false
    
    // 获取初始位置
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = element.getBoundingClientRect();
    elementX = rect.left;
    elementY = rect.top;
  };
  
  const mousemoveHandler = function(e) {
    if (startX === undefined) return;
    
    // 只有当鼠标移动超过阈值时才开始拖动
    if (!isDragging) {
      const moveX = Math.abs(e.clientX - startX);
      const moveY = Math.abs(e.clientY - startY);
      if (moveX < 3 && moveY < 3) return;
      
      isDragging = true;
      element.classList.add('chrome-memo-dragging');
    }
    
    // 计算新位置
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    let newX = elementX + dx;
    let newY = elementY + dy;
    
    // 限制在视窗内
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  };
  
  const mouseupHandler = function() {
    if (!isDragging) {
      startX = undefined;
      startY = undefined;
      return;
    }
    
    isDragging = false;
    startX = undefined;
    startY = undefined;
    element.classList.remove('chrome-memo-dragging');
    
    // 只有备忘录需要保存位置
    if (!element.classList.contains('chrome-memo-floating-icon')) {
      const position = {
        left: element.style.left,
        top: element.style.top,
        right: 'auto',
        bottom: 'auto'
      };
      
      chrome.storage.local.set({
        [`position_${window.location.hostname}`]: position
      });
    }
  };
  
  // 清理旧的事件监听器
  if (dragHandle._draggableCleanup) {
    dragHandle._draggableCleanup();
  }
  
  // 添加事件监听器
  dragHandle.addEventListener('mousedown', mousedownHandler);
  document.addEventListener('mousemove', mousemoveHandler);
  document.addEventListener('mouseup', mouseupHandler);
  
  // 保存清理函数
  dragHandle._draggableCleanup = function() {
    dragHandle.removeEventListener('mousedown', mousedownHandler);
    document.removeEventListener('mousemove', mousemoveHandler);
    document.removeEventListener('mouseup', mouseupHandler);
  };
}

// 修改获取模板选项的辅助函数，确保正确排序
function getTemplateOptions() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['templates'], (result) => {
      const templates = result.templates || {};
      let options = '';
      
      // 将模板转换为数组并按照存储的顺序排序
      const sortedTemplates = Object.entries(templates)
        .sort((a, b) => {
          // 使用 order 字段进行排序，如果不存在则使用创建时间
          const orderA = a[1].order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b[1].order ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
      
      // 生成选项
      for (const [name, template] of sortedTemplates) {
        options += `<option value="${name}">${name}</option>`;
      }
      
      resolve(options);
    });
  });
}

// 添加格式化按钮的悬停效果
function addFormatButtonsHoverEffect(editorContainer) {
  // 获取所有格式化按钮
  const formatBtns = editorContainer.querySelectorAll('.format-btn');
  
  // 为每个按钮添加悬停效果
  formatBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#f0f0f0';
      btn.style.borderColor = '#c0c0c0';
      btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
      btn.style.transform = 'translateY(-1px)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'white';
      btn.style.borderColor = '#e0e0e0';
      btn.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
      btn.style.transform = 'translateY(0)';
    });
  });
}

// 打开编辑器函数
function openEditor(initialContent) {
  // 如果已存在，则移除
  if (editorContainer) {
    editorContainer.remove();
  }
  
  // 清理内容，移除原有的"点击编辑"提示
  const cleanContent = initialContent.replace(/<div class="chrome-memo-edit-tip"[\s\S]*?<\/div>/g, '');
  
  const domain = window.location.hostname;
  
  // 创建编辑器容器
  editorContainer = document.createElement("div");
  editorContainer.className = "chrome-memo-editor";
  editorContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2147483647;
    width: 580px;
    max-width: 90%;
    display: flex;
    flex-direction: column;
    border-radius: 16px;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
    background: white;
    overflow: hidden;
    transition: all 0.2s ease-out;
    will-change: transform, opacity;
  `;
  
  // 编辑器HTML - 修改工具栏部分
  editorContainer.innerHTML = `
    <!-- 标题栏 - 增强阴影和渐变效果 -->
    <div class="chrome-memo-editor-header" style="
      background: linear-gradient(45deg, #7c4dff 0%, #5e72eb 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 2;
      border-radius: 16px 16px 0 0;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 16px;
        font-weight: 500;
      ">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z" fill="white"/>
        </svg>
        编辑「${domain}」的备忘录
      </div>
      
      <button class="chrome-memo-close-btn" style="
        background: rgba(255, 255, 255, 0.2);
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        color: white;
        font-size: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      ">×</button>
    </div>
    
    <!-- 工具栏 - 增强立体感和分隔 -->
    <div class="chrome-memo-toolbar" style="
      padding: 16px 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      align-items: center;
      background: #f9f9f9;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      position: relative;
      z-index: 1;
    ">
      <div style="display: flex; gap: 4px; margin-right: 10px;">
        <button class="format-btn" data-command="bold" style="
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          font-weight: bold;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        ">B</button>
        
        <button class="format-btn" data-command="italic" style="
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          font-style: italic;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        ">/</button>
        
        <button class="format-btn" data-command="underline" style="
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: underline;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        ">U</button>
        
        <button class="format-btn" data-command="strikeThrough" style="
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: line-through;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        ">S</button>
        
        <!-- 添加链接按钮 -->
        <button class="format-btn" data-command="createLink" title="插入链接" style="
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          font-weight: normal;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        ">🔗</button>
      </div>
      
      <!-- 修改模板选择器，减少宽度 -->
      <select class="template-select" style="
        padding: 8px 12px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        background: white;
        font-size: 14px;
        flex-grow: 0.7;
        max-width: 60%;
        cursor: pointer;
        outline: none;
        transition: all 0.2s;
        appearance: none;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 9l6 6 6-6\"/></svg>');
        background-repeat: no-repeat;
        background-position: right 12px center;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      ">
        <option value="">选择模板...</option>
      </select>
    </div>
    
    <!-- 内容区域 - 增加内容区域内凹效果 -->
    <div class="chrome-memo-content" style="
      padding: 20px;
      height: 300px; 
      max-height: 50vh;
      overflow-y: auto;
      background: white;
      scrollbar-width: thin;
      scrollbar-color: #d4d4d4 #f5f5f5;
      position: relative;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.03);
      background-color: #fafafa;
      text-align: left;
    ">
      <div contenteditable="true" class="chrome-memo-editable" style="
        outline: none;
        min-height: 200px;
        line-height: 1.6;
        color: #444;
        font-size: 14px;
        background-color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        text-align: left;
      ">${cleanContent}</div>
    </div>
    
    <!-- 底部按钮区域 - 更好的按钮对比 -->
    <div class="chrome-memo-footer" style="
      padding: 16px 20px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      background: #f4f4f4;
      border-radius: 0 0 16px 16px;
    ">
      <button class="chrome-memo-cancel-btn" style="
        background: white;
        border: 1px solid #e0e0e0;
        padding: 10px 18px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 500;
        color: #666;
        transition: all 0.2s;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      ">取消</button>
      
      <button class="chrome-memo-save-btn" style="
        background: linear-gradient(45deg, #7c4dff 0%, #5e72eb 100%);
        padding: 10px 22px;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        font-weight: 500;
        color: white;
        transition: all 0.2s;
        box-shadow: 0 2px 6px rgba(94, 114, 235, 0.3);
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
        </svg>
        保存备忘录
      </button>
    </div>
  `;
  
  // 添加到页面
  document.body.appendChild(editorContainer);
  
  // 使编辑器可拖动
  makeEditorDraggable(editorContainer);
  
  // 获取按钮和元素引用
  const closeBtn = editorContainer.querySelector('.chrome-memo-close-btn');
  const cancelBtn = editorContainer.querySelector('.chrome-memo-cancel-btn');
  const saveBtn = editorContainer.querySelector('.chrome-memo-save-btn');
  const formatBtns = editorContainer.querySelectorAll('.format-btn');
  const templateSelect = editorContainer.querySelector('.template-select');
  
  // 添加关闭按钮事件
  closeBtn.addEventListener('click', () => {
    editorContainer.remove();
  });
  
  // 添加取消按钮事件
  cancelBtn.addEventListener('click', () => {
    editorContainer.remove();
  });
  
  // 修改保存按钮的事件处理逻辑
  saveBtn.addEventListener('click', () => {
    const content = editorContainer.querySelector('.chrome-memo-editable').innerHTML;
    
    // 检查是否为空内容
    if (isEmptyContent(content)) {
      // 内容为空，隐藏备忘录并清除存储
      chrome.storage.local.remove([`memo_${domain}`], () => {
        console.log('备忘录内容为空，已清除', domain);
        
        // 如果当前正在显示备忘录，则移除它
        if (memoContainer) {
          memoContainer.remove();
          memoContainer = null;
        }
        
        // 更新存储中的可见性状态
        chrome.runtime.sendMessage({
          action: "updateMemoVisibility",
          domain: domain,
          isVisible: false
        });
        
        // 关闭编辑器
        editorContainer.remove();
      });
    } else {
      // 新的内容处理逻辑
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      // 处理所有非引用块元素，移除它们的样式
      const nonQuoteElements = tempDiv.querySelectorAll('div:not(blockquote), p:not(blockquote)');
      nonQuoteElements.forEach(element => {
        element.removeAttribute('style');
      });
      
      // 确保引用块保持其样式
      const blockquotes = tempDiv.querySelectorAll('blockquote');
      blockquotes.forEach(quote => {
        if (!quote.hasAttribute('style')) {
          quote.setAttribute('style', 'border-left: 3px solid #7c4dff; padding-left: 10px; margin: 10px 0; color: #555;');
        }
      });
      
      const processedContent = tempDiv.innerHTML;
      
      // 内容不为空，正常保存
      chrome.storage.local.set({ [`memo_${domain}`]: processedContent }, () => {
        console.log('备忘录已保存', domain, processedContent);
        
        // 如果当前正在显示备忘录，则更新内容
        if (memoContainer) {
          memoContainer.querySelector('.chrome-memo-actual-content').innerHTML = processedContent;
        } else {
          // 如果没有显示备忘录，则创建一个新的
          createMemoElement(processedContent);
        }
        
        // 关闭编辑器
        editorContainer.remove();
      });
    }
  });
  
  // 在编辑器的内容区域添加事件监听
  const editableDiv = editorContainer.querySelector('.chrome-memo-editable');
  editableDiv.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // 插入一个普通的换行和段落，不继承样式
      document.execCommand('insertHTML', false, '<div><br></div>');
    }
  });
  
  // 修改格式化按钮事件处理
  formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const command = btn.dataset.command;
      
      // 链接按钮需要特殊处理
      if (command === 'createLink') {
        const url = prompt('请输入链接地址:', 'https://');
        if (url) {
          // 自动添加协议前缀
          let formattedUrl = url.trim();
          
          // 检查是否已包含协议前缀
          if (!/^(https?|ftp|file|mailto|tel):\/\//.test(formattedUrl) && 
              !formattedUrl.startsWith('mailto:') && 
              !formattedUrl.startsWith('tel:')) {
            
            // 默认添加https协议
            formattedUrl = 'https://' + formattedUrl;
          }
          
          // 保存当前选区范围
          const selection = window.getSelection();
          
          // 创建链接
          document.execCommand(command, false, formattedUrl);
          
          // 设置链接在新标签页打开
          setTimeout(() => {
            const editableDiv = editorContainer.querySelector('.chrome-memo-editable');
            const links = editableDiv.querySelectorAll('a');
            
            // 将所有链接设置为在新标签页打开
            links.forEach(link => {
              if (!link.hasAttribute('target')) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer'); // 安全性考虑
              }
            });
          }, 0);
        }
      } else {
        document.execCommand(command, false, null);
      }
      
      editorContainer.querySelector('.chrome-memo-editable').focus();
    });
  });
  
  // 处理模板选择
  // 加载模板列表
  getTemplateOptions().then(options => {
    templateSelect.innerHTML = '<option value="">选择模板...</option>' + options;
    
    // 添加模板选择事件
    templateSelect.addEventListener('change', () => {
      if (templateSelect.value) {
        const templateName = templateSelect.value;
        
        chrome.storage.local.get(['templates'], (result) => {
          const templates = result.templates || {};
          if (templates[templateName]) {
            const confirmChange = confirm(`确定要使用模板"${templateName}"替换当前内容吗？`);
            if (confirmChange) {
              editorContainer.querySelector('.chrome-memo-editable').innerHTML = templates[templateName].content;
              templateSelect.value = '';
            }
          }
        });
      }
    });
  });
  
  // 自动聚焦到编辑区域
  setTimeout(() => {
    const editableArea = editorContainer.querySelector('.chrome-memo-editable');
    editableArea.focus();
    
    // 将光标移到文本末尾
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(editableArea);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, 0);
  
  // 添加按钮悬停效果
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    closeBtn.style.transform = 'scale(1.05)';
    closeBtn.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
  });

  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    closeBtn.style.transform = 'scale(1)';
    closeBtn.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
  });

  // 取消按钮悬停效果
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = '#f5f5f5';
    cancelBtn.style.borderColor = '#d0d0d0';
    cancelBtn.style.color = '#444';
    cancelBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
  });

  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = 'white';
    cancelBtn.style.borderColor = '#e0e0e0';
    cancelBtn.style.color = '#666';
    cancelBtn.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
  });

  // 保存按钮悬停效果
  saveBtn.addEventListener('mouseenter', () => {
    saveBtn.style.boxShadow = '0 4px 8px rgba(94, 114, 235, 0.4)';
    saveBtn.style.transform = 'translateY(-1px)';
    saveBtn.style.background = 'linear-gradient(45deg, #7140e0 0%, #4e62db 100%)';
  });

  saveBtn.addEventListener('mouseleave', () => {
    saveBtn.style.boxShadow = '0 2px 6px rgba(94, 114, 235, 0.3)';
    saveBtn.style.transform = 'translateY(0)';
    saveBtn.style.background = 'linear-gradient(45deg, #7c4dff 0%, #5e72eb 100%)';
  });
  
  // 添加格式化按钮悬停效果
  addFormatButtonsHoverEffect(editorContainer);
  
  return editorContainer;
}

// 添加拖动功能的辅助函数 - 性能优化版
function makeEditorDraggable(editor) {
  const header = editor.querySelector('.chrome-memo-editor-header');
  
  if (!header) return;
  
  header.style.cursor = 'move';
  
  let isDragging = false;
  let startX, startY;
  let startLeft, startTop;
  let rafId = null;
  
  // 使用transform替代left/top，启用GPU加速
  editor.style.transform = 'translate(-50%, -50%)';
  editor.style.willChange = 'transform';
  
  const mousedownHandler = function(e) {
    // 跳过标题栏上的按钮点击
    if (e.target !== header && e.target.parentElement === header) return;
    
    e.preventDefault();
    
    // 停止居中定位，切换到绝对定位
    const rect = editor.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    
    // 应用当前位置，移除居中transform
    editor.style.left = startLeft + 'px';
    editor.style.top = startTop + 'px';
    editor.style.transform = 'none';
    editor.style.transition = 'none';
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    // 添加拖动时的视觉反馈
    editor.classList.add('dragging');
  };
  
  const mousemoveHandler = function(e) {
    if (!isDragging) return;
    
    // 使用requestAnimationFrame优化性能
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    rafId = requestAnimationFrame(() => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // 计算新位置
      const newLeft = startLeft + dx;
      const newTop = startTop + dy;
      
      // 使用transform进行移动，可触发GPU加速
      editor.style.left = newLeft + 'px';
      editor.style.top = newTop + 'px';
    });
  };
  
  const mouseupHandler = function() {
    if (!isDragging) return;
    
    isDragging = false;
    rafId && cancelAnimationFrame(rafId);
    rafId = null;
    
    // 移除视觉反馈
    editor.classList.remove('dragging');
  };
  
  // 确保清理旧的事件监听器
  if (header._draggableCleanup) {
    header._draggableCleanup();
  }
  
  // 添加事件监听
  header.addEventListener('mousedown', mousedownHandler);
  document.addEventListener('mousemove', mousemoveHandler);
  document.addEventListener('mouseup', mouseupHandler);
  
  // 存储清理函数
  header._draggableCleanup = function() {
    header.removeEventListener('mousedown', mousedownHandler);
    document.removeEventListener('mousemove', mousemoveHandler);
    document.removeEventListener('mouseup', mouseupHandler);
    rafId && cancelAnimationFrame(rafId);
  };
  
  // 确保编辑器关闭时清理事件
  const originalRemove = editor.remove;
  editor.remove = function() {
    if (header._draggableCleanup) {
      header._draggableCleanup();
    }
    return originalRemove.apply(this, arguments);
  };
}

function handleDragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  this.classList.add('dragging');
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.template-item').forEach(item => {
    item.classList.remove('over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  this.classList.add('over');
}

function handleDragLeave(e) {
  this.classList.remove('over');
}

function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  
  if (dragSrcEl !== this) {
    const list = document.getElementById('template-list');
    const items = [...list.children];
    const fromIndex = items.indexOf(dragSrcEl);
    const toIndex = items.indexOf(this);
    
    if (fromIndex >= 0 && toIndex >= 0) {
      // 重新排序 DOM
      if (fromIndex < toIndex) {
        this.parentNode.insertBefore(dragSrcEl, this.nextSibling);
      } else {
        this.parentNode.insertBefore(dragSrcEl, this);
      }
      
      // 更新存储中的顺序
      chrome.storage.sync.get(['memoTemplates'], (result) => {
        const templates = result.memoTemplates || {};
        const newTemplates = {};
        
        // 根据新的 DOM 顺序重建模板对象
        items.forEach(item => {
          const name = item.dataset.name;
          if (templates[name]) {
            newTemplates[name] = templates[name];
          }
        });
        
        chrome.storage.sync.set({ memoTemplates: newTemplates });
      });
    }
  }
  
  this.classList.remove('over');
  return false;
}

// 页面加载时初始化备忘录
function initializeMemo() {
  const domain = window.location.hostname;
  
  // 添加覆盖样式，禁用所有"点击编辑"提示
  const overrideStyle = document.createElement('style');
  overrideStyle.textContent = `
    /* 彻底禁用所有"点击编辑"提示 */
    .chrome-memo-content:hover::after,
    .chrome-memo-content:hover::before,
    .chrome-memo-editor .chrome-memo-content:hover::after,
    .chrome-memo-editor .chrome-memo-content *:hover::after,
    .chrome-memo-editable:hover::after,
    .chrome-memo-editor:hover::after,
    [class*="chrome-memo"]:hover::after {
      content: none !important;
      display: none !important;
    }
  `;
  document.head.appendChild(overrideStyle);
  
  // 加载快速添加功能的设置
  chrome.storage.local.get(['enableQuickAdd'], (result) => {
    isQuickAddEnabled = result.enableQuickAdd !== false;
  });
  
  // 检查是否有保存的备忘录内容
  chrome.storage.local.get([`memo_${domain}`], (result) => {
    const memoContent = result[`memo_${domain}`];
    
    // 如果存在备忘录内容且不为空，则显示它
    if (memoContent && !isEmptyContent(memoContent)) {
      console.log('找到保存的备忘录，正在显示:', domain);
      createMemoElement(memoContent);
    } else {
      console.log('当前域名没有保存的备忘录或内容为空:', domain);
      // 如果内容为空，确保清除存储
      if (memoContent && isEmptyContent(memoContent)) {
        chrome.storage.local.remove([`memo_${domain}`]);
      }
    }
  });
}

// 确保页面完全加载后初始化备忘录
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMemo);
} else {
  initializeMemo();
}

// 添加选中文本处理功能（在文件末尾添加）
function initSelectionHandler() {
  // 创建选中文本后的弹出菜单
  function createSelectionPopup() {
    if (selectionPopup) {
      selectionPopup.remove();
    }
    
    selectionPopup = document.createElement('div');
    selectionPopup.className = 'chrome-memo-selection-popup';
    selectionPopup.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      background: white;
      border-radius: 8px;
      box-shadow: 0 3px 15px rgba(0, 0, 0, 0.2);
      padding: 8px;
      display: none;
    `;
    
    selectionPopup.innerHTML = `
      <button class="add-to-memo-btn">添加到备忘录</button>
    `;
    
    document.body.appendChild(selectionPopup);
    
    // 添加点击事件
    selectionPopup.querySelector('.add-to-memo-btn').addEventListener('click', addSelectionToMemo);
    
    return selectionPopup;
  }
  
  // 显示选中文本弹出菜单
  function showSelectionPopup(x, y) {
    if (!selectionPopup) {
      createSelectionPopup();
    }
    
    // 确保位置在视窗内
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 140; // 估计的弹出菜单宽度
    const popupHeight = 40; // 估计的弹出菜单高度
    
    // 调整 x 坐标，确保不超出屏幕
    x = Math.min(Math.max(0, x), viewportWidth - popupWidth);
    
    // 调整 y 坐标，如果太靠上就显示在选中文本下方
    if (y < popupHeight) {
      y = y + popupHeight + 80; // 显示在下方
    }
    
    // 设置位置并显示
    selectionPopup.style.left = `${x}px`;
    selectionPopup.style.top = `${y}px`;
    selectionPopup.style.display = 'block';
  }
  
  // 隐藏选中文本弹出菜单
  function hideSelectionPopup(e) {
    if (selectionPopup) {
      selectionPopup.style.display = 'none';
    }
  }
  
  // 添加选中文本到备忘录
  function addSelectionToMemo() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    // 获取选中文本
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    
    // 检查当前网站是否有备忘录
    const domain = window.location.hostname;
    chrome.storage.local.get([`memo_${domain}`], (result) => {
      const memoContent = result[`memo_${domain}`];
      
      if (memoContent) {
        // 创建格式化后的文本
        const formattedText = `<blockquote style="border-left: 3px solid #7c4dff; padding-left: 10px; margin: 10px 0; color: #555;">${selectedText}</blockquote>`;
        
        // 更新备忘录内容
        const updatedContent = memoContent + formattedText;
        chrome.storage.local.set({ [`memo_${domain}`]: updatedContent }, () => {
          console.log('已添加选中文本到备忘录');
          
          // 如果当前显示了备忘录，则更新内容
          if (memoContainer) {
            memoContainer.querySelector('.chrome-memo-actual-content').innerHTML = updatedContent;
          }
          
          // 显示成功提示
          showAddedToast();
        });
      } else {
        // 如果没有备忘录，则创建一个新的
        const formattedText = `<blockquote style="border-left: 3px solid #7c4dff; padding-left: 10px; margin: 10px 0; color: #555;">${selectedText}</blockquote>`;
        chrome.storage.local.set({ [`memo_${domain}`]: formattedText }, () => {
          console.log('已创建新备忘录并添加选中文本');
          
          // 创建并显示备忘录
          createMemoElement(formattedText);
          
          // 显示成功提示
          showAddedToast();
        });
      }
      
      // 隐藏弹出菜单
      hideSelectionPopup();
    });
  }
  
  // 显示添加成功的提示
  function showAddedToast() {
    const toast = document.createElement('div');
    toast.className = 'chrome-memo-toast';
    toast.textContent = '✓ 已添加到备忘录';
    document.body.appendChild(toast);
    
    // 动画显示
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
  
  // 监听选中文本事件
  document.addEventListener('mouseup', (e) => {
    if (!isQuickAddEnabled) {
      return;
    }
    
    // 延迟处理，确保选择已完成
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        hideSelectionPopup();
        return;
      }
      
      const selectedText = selection.toString().trim();
      if (!selectedText) {
        hideSelectionPopup();
        return;
      }

      // 检查选中区域是否在备忘录或编辑器内
      const target = e.target;
      const isInMemo = target.closest('.chrome-memo-container');
      const isInEditor = target.closest('.chrome-memo-editor');
      
      // 如果在备忘录或编辑器内,不显示添加按钮
      if (isInMemo || isInEditor) {
        hideSelectionPopup();
        return;
      }
      
      // 获取选中区域的位置信息
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // 显示弹出菜单
      const x = rect.left + window.scrollX + (rect.width / 2) - 70;
      const y = rect.top + window.scrollY - 60;
      
      showSelectionPopup(x, y);
    }, 10);
  });
  
  // 点击其他区域时隐藏选中菜单
  document.addEventListener('mousedown', (e) => {
    if (selectionPopup && !selectionPopup.contains(e.target)) {
      hideSelectionPopup();
    }
  });
}

// 初始化选中文本处理
document.addEventListener('DOMContentLoaded', initSelectionHandler);

// 如果页面已经加载完毕，立即初始化
if (document.readyState !== 'loading') {
  initSelectionHandler();
} 