/**
 * 弹出窗口JavaScript
 * 处理扩展弹出窗口的操作逻辑
 */

document.addEventListener('DOMContentLoaded', async function() {
  const statusElement = document.getElementById('status');
  const toggleMemoBtn = document.getElementById('toggleMemoBtn');
  const createOrEditBtn = document.getElementById('createOrEditBtn');
  const toggleSelectionBtn = document.getElementById('toggleSelectionBtn');
  const siteList = document.getElementById('siteList');
  const emptyList = document.getElementById('emptyList');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importDataBtn = document.getElementById('importDataBtn');
  const fileInput = document.getElementById('fileInput');
  
  let currentTab = null;
  let isSelectionEnabled = false;
  
  // 获取当前标签页
  async function getCurrentTab() {
    try {
      const queryOptions = { active: true, currentWindow: true };
      const [tab] = await chrome.tabs.query(queryOptions);
      return tab;
    } catch (error) {
      console.error('获取当前标签页失败:', error);
      throw error;
    }
  }
  
  // 初始化弹出窗口
  async function initPopup() {
    try {
      // 获取当前标签页
      currentTab = await getCurrentTab();
      
      // 如果获取不到标签页信息
      if (!currentTab) {
        statusElement.innerHTML = '无法获取当前页面信息';
        // 默认禁用导出按钮，直到确认有备忘录数据
        exportDataBtn.disabled = true;
        return;
      }
      
      // 检查当前网站是否有备忘录
      await checkCurrentSiteMemo();
      
      // 加载所有保存的备忘录站点
      await loadSavedSites();
      
      // 检查选中文本添加功能状态
      checkSelectionFeatureStatus();
    } catch (error) {
      console.error('初始化弹出窗口失败:', error);
      statusElement.innerHTML = '初始化失败，请重试';
      // 默认禁用导出按钮
      exportDataBtn.disabled = true;
      // 启用基本功能
      enableBasicFunctions();
    }
  }
  
  // 在发生错误时启用基本功能
  function enableBasicFunctions() {
    toggleMemoBtn.textContent = '创建备忘录';
    toggleMemoBtn.disabled = false;
    toggleSelectionBtn.textContent = '开启选中文本添加';
    toggleSelectionBtn.disabled = false;
  }
  
  // 直接从存储获取状态（备用方案）
  async function getStateFromStorage() {
    try {
      if (!currentTab) return null;
      
      const url = new URL(currentTab.url);
      const domain = url.hostname;
      
      // 直接从Chrome存储中读取
      return new Promise((resolve, reject) => {
        chrome.storage.sync.get('memos', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            const memos = result.memos || {};
            resolve(memos[domain] || null);
          }
        });
      });
    } catch (error) {
      console.error('从存储获取状态失败:', error);
      return null;
    }
  }
  
  // 检查当前网站是否有备忘录
  async function checkCurrentSiteMemo() {
    try {
      // 从当前标签页URL获取域名
      if (!currentTab || !currentTab.url) {
        statusElement.innerHTML = '无法获取当前网站信息';
        return;
      }
      
      const url = new URL(currentTab.url);
      const domain = url.hostname;
      
      if (!domain) {
        statusElement.innerHTML = '无效的网站域名';
        return;
      }
      
      let memo = null;
      let success = false;
      
      // 首先尝试通过消息获取
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getMemo',
          domain: domain
        });
        
        console.log('getMemo响应:', response);
        
        if (response && response.success) {
          success = true;
          memo = response.memo;
        } else {
          console.warn('通过消息获取备忘录失败:', response?.error || '未知错误');
        }
      } catch (error) {
        console.error('发送消息失败:', error);
      }
      
      // 如果消息方式失败，尝试直接从存储获取
      if (!success) {
        console.log('尝试直接从存储获取备忘录');
        memo = await getStateFromStorage();
      }
      
      if (memo) {
        // 更新状态显示
        statusElement.innerHTML = `
          <strong>当前网站:</strong> ${domain}<br>
          <strong>状态:</strong> 已有备忘录${memo.isVisible ? '（已显示）' : '（已隐藏）'}
        `;
        
        // 更新按钮文本
        toggleMemoBtn.textContent = memo.isVisible ? '隐藏备忘录' : '显示备忘录';
      } else {
        // 未找到备忘录
        statusElement.innerHTML = `
          <strong>当前网站:</strong> ${domain}<br>
          <strong>状态:</strong> 无备忘录
        `;
        
        // 更新按钮文本
        toggleMemoBtn.textContent = '创建备忘录';
      }
    } catch (error) {
      console.error('检查当前网站备忘录失败:', error);
      statusElement.innerHTML = '无法检查当前网站的备忘录状态';
      enableBasicFunctions();
    }
  }
  
  // 加载所有保存的备忘录站点
  async function loadSavedSites() {
    try {
      // 获取所有备忘录
      let allMemos = {};
      
      // 如果全局变量可用，使用它
      if (window.storageManager) {
        allMemos = await window.storageManager.getAllMemos();
      } else {
        // 否则直接从Chrome存储中读取
        allMemos = await new Promise((resolve, reject) => {
          chrome.storage.sync.get('memos', (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result.memos || {});
            }
          });
        });
      }
      
      // 确保allMemos是一个对象
      if (!allMemos || typeof allMemos !== 'object') {
        console.warn('获取到的备忘录数据不是对象:', allMemos);
        allMemos = {};
      }
      
      const sites = Object.keys(allMemos).map(domain => ({
        domain,
        content: allMemos[domain].content,
        url: allMemos[domain].url || `https://${domain}`,
        title: allMemos[domain].title || domain,
        updatedAt: allMemos[domain].updatedAt || allMemos[domain].createdAt
      }));
      
      // 清空当前列表
      siteList.innerHTML = '';
      
      if (sites.length === 0) {
        // 显示空列表提示
        emptyList.style.display = 'block';
        
        // 禁用导出按钮
        exportDataBtn.disabled = true;
        exportDataBtn.title = '没有备忘录数据可导出';
      } else {
        // 隐藏空列表提示
        emptyList.style.display = 'none';
        
        // 启用导出按钮
        exportDataBtn.disabled = false;
        exportDataBtn.title = '导出所有备忘录数据';
        
        // 按更新时间排序，最新的在前面
        sites.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        // 添加站点到列表
        sites.forEach(site => {
          const siteItem = createSiteItem(site);
          siteList.appendChild(siteItem);
        });
      }
      
      // 返回加载的站点数量，方便调试
      return sites.length;
    } catch (error) {
      console.error('加载站点列表失败:', error);
      showToast('加载站点列表失败', 'error');
      emptyList.style.display = 'block';
      emptyList.textContent = '加载站点列表失败';
      throw error; // 重新抛出错误，让调用者知道加载失败
    }
  }
  
  // 创建站点列表项
  function createSiteItem(site) {
    const li = document.createElement('li');
    li.className = 'site-item';
    
    const header = document.createElement('div');
    header.className = 'site-header';
    
    const domain = document.createElement('div');
    domain.className = 'site-domain';
    
    const link = document.createElement('a');
    link.href = site.url;
    link.textContent = site.domain;
    link.title = site.url;
    link.target = '_blank';
    
    domain.appendChild(link);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-site';
    deleteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
    deleteBtn.title = '删除备忘录';
    deleteBtn.dataset.domain = site.domain;
    
    header.appendChild(domain);
    header.appendChild(deleteBtn);
    
    const content = document.createElement('div');
    content.className = 'site-content';
    content.textContent = extractTextContent(site.content);
    
    const date = document.createElement('div');
    date.className = 'site-date';
    date.textContent = `更新于: ${formatDate(site.updatedAt)}`;
    
    li.appendChild(header);
    li.appendChild(content);
    li.appendChild(date);
    
    // 添加删除按钮事件
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const domain = deleteBtn.dataset.domain;
      
      // 使用自定义确认对话框替代原生confirm
      const confirmed = await showCustomConfirm(`确定要删除备忘录吗？`, domain);
      if (confirmed) {
        await deleteSite(domain);
      }
    });
    
    return li;
  }
  
  // 自定义确认对话框
  function showCustomConfirm(message, domain) {
    return new Promise((resolve) => {
      // 创建遮罩层
      const overlay = document.createElement('div');
      overlay.className = 'custom-confirm-overlay';
      
      // 创建对话框
      const dialog = document.createElement('div');
      dialog.className = 'custom-confirm-dialog';
      
      // 创建标题
      const header = document.createElement('div');
      header.className = 'custom-confirm-header';
      header.textContent = '扩展程序网站备忘录提示';
      
      // 创建内容
      const content = document.createElement('div');
      content.className = 'custom-confirm-content';
      content.innerHTML = `${message}<span class="custom-confirm-domain">${domain}</span>`;
      
      // 创建按钮容器
      const buttons = document.createElement('div');
      buttons.className = 'custom-confirm-buttons';
      
      // 取消按钮
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-confirm-button custom-confirm-cancel';
      cancelBtn.textContent = '取消';
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(false);
      });
      
      // 确认按钮
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'custom-confirm-button custom-confirm-delete';
      confirmBtn.textContent = '确定';
      confirmBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(true);
      });
      
      // 组装对话框
      buttons.appendChild(cancelBtn);
      buttons.appendChild(confirmBtn);
      dialog.appendChild(header);
      dialog.appendChild(content);
      dialog.appendChild(buttons);
      overlay.appendChild(dialog);
      
      // 添加到页面
      document.body.appendChild(overlay);
      
      // 聚焦确认按钮
      confirmBtn.focus();
      
      // 添加ESC键关闭
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          document.body.removeChild(overlay);
          document.removeEventListener('keydown', handleKeyDown);
          resolve(false);
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
    });
  }
  
  // 提取HTML中的文本内容
  function extractTextContent(html) {
    if (!html) return '无内容';
    
    // 创建临时元素解析HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // 返回纯文本内容
    return temp.textContent || temp.innerText || '无内容';
  }
  
  // 格式化日期显示
  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '未知日期';
    }
  }
  
  // 删除站点备忘录
  async function deleteSite(domain) {
    try {
      // 尝试多种删除方式
      let success = false;
      
      // 如果全局变量可用，使用它
      if (window.storageManager) {
        await window.storageManager.deleteMemo(domain);
        success = true;
      } else {
        // 通过消息请求删除
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'deleteMemo',
            domain: domain
          });
          
          if (response && response.success) {
            success = true;
          }
        } catch (error) {
          console.error('通过消息删除失败:', error);
        }
        
        // 如果消息方式失败，尝试直接删除
        if (!success) {
          await new Promise((resolve, reject) => {
            chrome.storage.sync.get('memos', (result) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
              }
              
              const memos = result.memos || {};
              if (!memos[domain]) {
                resolve(false);
                return;
              }
              
              delete memos[domain];
              chrome.storage.sync.set({ memos }, () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(true);
                }
              });
            });
          });
          success = true;
        }
      }
      
      // 如果是当前站点，更新状态
      if (currentTab && new URL(currentTab.url).hostname === domain) {
        await checkCurrentSiteMemo();
        
        // 向当前页面发送消息，通知备忘录已被删除
        try {
          await chrome.tabs.sendMessage(currentTab.id, { 
            action: 'memoDeleted',
            domain: domain
          });
          console.log('已通知当前页面备忘录已删除');
        } catch (error) {
          console.error('通知当前页面失败:', error);
        }
      }
      
      // 重新加载站点列表
      await loadSavedSites();
      
      showToast('删除成功');
    } catch (error) {
      console.error('删除站点失败:', error);
      showToast('删除站点失败', 'error');
    }
  }
  
  // 显示/隐藏备忘录
  async function toggleMemo() {
    try {
      if (!currentTab) {
        showToast('无法获取当前标签页信息', 'error');
        return;
      }
      
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'toggleMemo'
      });
      
      // 更新状态
      setTimeout(checkCurrentSiteMemo, 300);
    } catch (error) {
      console.error('切换备忘录显示状态失败:', error);
      showToast('操作失败，请刷新页面后重试', 'error');
    }
  }
  
  // 切换选中文本添加功能
  async function toggleSelectionFeature() {
    isSelectionEnabled = !isSelectionEnabled;
    
    try {
      if (!currentTab) {
        showToast('无法获取当前标签页信息', 'error');
        return;
      }
      
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'toggleSelection',
        enabled: isSelectionEnabled
      });
      
      updateSelectionButtonText();
      showToast(isSelectionEnabled ? '已开启选中文本添加功能' : '已关闭选中文本添加功能');
    } catch (error) {
      console.error('切换选中文本添加功能失败:', error);
      showToast('操作失败，请刷新页面后重试', 'error');
      // 恢复状态
      isSelectionEnabled = !isSelectionEnabled;
      updateSelectionButtonText();
    }
  }
  
  // 检查选中文本添加功能状态
  async function checkSelectionFeatureStatus() {
    try {
      if (!currentTab) {
        console.warn('无法获取当前标签页信息');
        return;
      }
      
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'getSelectionStatus'
      });
      
      isSelectionEnabled = response && response.enabled;
      updateSelectionButtonText();
    } catch (error) {
      console.error('获取选中文本功能状态失败:', error);
      isSelectionEnabled = false;
      updateSelectionButtonText();
    }
  }
  
  // 更新选中文本按钮文本
  function updateSelectionButtonText() {
    toggleSelectionBtn.textContent = isSelectionEnabled ? '关闭选中文本添加' : '开启选中文本添加';
  }
  
  // 导出数据
  async function exportData() {
    try {
      // 获取所有备忘录
      let memos = {};
      
      // 尝试获取备忘录数据
      try {
        memos = await new Promise((resolve, reject) => {
          chrome.storage.sync.get('memos', (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result.memos || {});
            }
          });
        });
      } catch (error) {
        console.error('获取备忘录数据失败:', error);
        showToast('获取备忘录数据失败', 'error');
        return;
      }
      
      // 检查备忘录是否为空
      if (!memos || Object.keys(memos).length === 0) {
        showToast('没有备忘录数据可导出', 'error');
        return;
      }
      
      let exportedData;
      
      // 尝试使用background.js中的函数
      try {
        const response = await chrome.runtime.sendMessage({ action: 'exportData' });
        
        if (!response.success) {
          throw new Error(response.error || '导出数据失败');
        }
        
        exportedData = response.data;
        
        // 如果没有返回数据，使用本地数据
        if (!exportedData) {
          exportedData = {
            memos,
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
          };
        }
      } catch (error) {
        // 如果background.js不可用，直接从storage获取数据
        exportedData = {
          memos,
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
        };
      }
      
      // 创建数据URL
      const dataStr = JSON.stringify(exportedData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const dataUrl = URL.createObjectURL(dataBlob);
      
      // 创建下载链接并触发下载
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `chrome-memo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // 释放URL对象
      setTimeout(() => {
        URL.revokeObjectURL(dataUrl);
      }, 100);
      
      showToast('数据导出成功');
    } catch (error) {
      console.error('导出数据失败:', error);
      showToast('导出失败: ' + error.message, 'error');
    }
  }
  
  // 导入数据
  function importData() {
    document.getElementById('fileInput').click();
  }
  
  // 处理文件选择后的导入操作
  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // 验证数据格式
          if (!data || !data.memos) {
            throw new Error('无效的数据格式');
          }
          
          // 显示加载中提示
          showToast('正在导入数据...', 'info');
          
          // 尝试使用background.js中的函数导入
          try {
            const response = await chrome.runtime.sendMessage({ 
              action: 'importData', 
              data 
            });
            
            if (!response.success) {
              throw new Error(response.error || '导入数据失败');
            }
          } catch (error) {
            console.error('通过background.js导入失败:', error);
            // 如果background.js不可用，直接保存到storage
            // 导入备忘录数据
            await new Promise((resolve, reject) => {
              chrome.storage.sync.set({ memos: data.memos }, () => {
                if (chrome.runtime.lastError) {
                  console.error('导入备忘录失败:', chrome.runtime.lastError);
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
          }
          
          // 强制刷新Chrome存储中的数据
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // 重新加载站点列表
          try {
            await loadSavedSites();
          } catch (error) {
            console.error('重新加载站点列表失败:', error);
            // 如果加载失败，尝试再次加载
            await new Promise(resolve => setTimeout(resolve, 200));
            await loadSavedSites();
          }
          
          // 更新当前站点状态
          if (currentTab && currentTab.url) {
            await checkCurrentSiteMemo();
          }
          
          showToast('数据导入成功');
        } catch (error) {
          console.error('处理导入数据失败:', error);
          showToast('导入失败: ' + error.message, 'error');
        }
      };
      
      reader.readAsText(file);
      
      // 重置文件输入，允许选择同一文件
      fileInput.value = '';
    } catch (error) {
      console.error('读取文件失败:', error);
      showToast('读取文件失败', 'error');
    }
  }
  
  // 显示提示消息
  function showToast(message, type = 'success') {
    let toast = document.querySelector('.toast');
    
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // 显示提示
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 3秒后隐藏
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
  
  // 初始化事件监听
  function setupEventListeners() {
    toggleMemoBtn.addEventListener('click', toggleMemo);
    createOrEditBtn.addEventListener('click', createOrEditMemo);
    toggleSelectionBtn.addEventListener('click', toggleSelectionFeature);
    exportDataBtn.addEventListener('click', exportData);
    importDataBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
  }
  
  // 创建或编辑备忘录（一键操作）
  async function createOrEditMemo() {
    try {
      if (!currentTab) {
        showToast('无法获取当前标签页信息', 'error');
        return;
      }
      
      // 先确保备忘录可见
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'showMemo'
      });
      
      // 然后直接打开编辑器
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'openEditor'
      });
      
      // 关闭弹出窗口
      window.close();
    } catch (error) {
      console.error('创建或编辑备忘录失败:', error);
      showToast('操作失败，请刷新页面后重试', 'error');
    }
  }
  
  // 初始化
  initPopup();
  setupEventListeners();
}); 