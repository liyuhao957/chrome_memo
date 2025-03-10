/**
 * 弹出窗口JavaScript
 * 处理扩展弹出窗口的操作逻辑
 */

import { storageManager } from './data/storage.js';

document.addEventListener('DOMContentLoaded', async function() {
  const statusElement = document.getElementById('status');
  const toggleMemoBtn = document.getElementById('toggleMemoBtn');
  const openEditorBtn = document.getElementById('openEditorBtn');
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
    const queryOptions = { active: true, currentWindow: true };
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  }
  
  // 初始化弹出窗口
  async function initPopup() {
    // 获取当前标签页
    currentTab = await getCurrentTab();
    
    // 检查当前网站是否有备忘录
    await checkCurrentSiteMemo();
    
    // 加载所有保存的备忘录站点
    await loadSavedSites();
    
    // 检查选中文本添加功能状态
    checkSelectionFeatureStatus();
  }
  
  // 检查当前网站是否有备忘录
  async function checkCurrentSiteMemo() {
    try {
      // 从当前标签页URL获取域名
      const url = new URL(currentTab.url);
      const domain = url.hostname;
      
      // 查询存储中是否有该域名的备忘录
      const response = await chrome.runtime.sendMessage({
        action: 'getMemo',
        domain: domain
      });
      
      if (response && response.memo) {
        const memo = response.memo;
        
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
    }
  }
  
  // 加载所有保存的备忘录站点
  async function loadSavedSites() {
    try {
      // 获取所有备忘录
      const allMemos = await storageManager.getAllMemos();
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
        return;
      }
      
      // 隐藏空列表提示
      emptyList.style.display = 'none';
      
      // 按更新时间排序，最新的在前面
      sites.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      // 添加站点到列表
      sites.forEach(site => {
        const item = createSiteItem(site);
        siteList.appendChild(item);
      });
    } catch (error) {
      console.error('加载站点列表失败:', error);
      showToast('加载站点列表失败', 'error');
    }
  }
  
  // 创建站点列表项
  function createSiteItem(site) {
    const li = document.createElement('li');
    li.className = 'site-item';
    
    // 提取文本内容
    const textContent = extractTextContent(site.content);
    
    // 格式化日期
    const formattedDate = formatDate(site.updatedAt);
    
    li.innerHTML = `
      <div class="site-header">
        <div class="site-domain">
          <a href="${site.url}" target="_blank" title="${site.title}">${site.domain}</a>
        </div>
        <button class="delete-site" data-domain="${site.domain}">删除</button>
      </div>
      <div class="site-content">${textContent}</div>
      <span class="site-date">更新于: ${formattedDate}</span>
    `;
    
    // 添加删除事件
    const deleteBtn = li.querySelector('.delete-site');
    deleteBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      const domain = deleteBtn.dataset.domain;
      
      if (confirm(`确定要删除 ${domain} 的备忘录吗？`)) {
        await deleteSite(domain);
      }
    });
    
    return li;
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
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // 删除站点备忘录
  async function deleteSite(domain) {
    try {
      await storageManager.deleteMemo(domain);
      
      // 如果是当前站点，更新状态
      if (currentTab && new URL(currentTab.url).hostname === domain) {
        await checkCurrentSiteMemo();
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
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'toggleMemo'
      });
      
      // 更新状态
      setTimeout(checkCurrentSiteMemo, 300);
    } catch (error) {
      console.error('切换备忘录显示状态失败:', error);
      showToast('操作失败', 'error');
    }
  }
  
  // 打开编辑器
  async function openEditor() {
    try {
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'openEditor'
      });
      
      // 关闭弹出窗口
      window.close();
    } catch (error) {
      console.error('打开编辑器失败:', error);
      showToast('打开编辑器失败', 'error');
    }
  }
  
  // 切换选中文本添加功能
  async function toggleSelectionFeature() {
    isSelectionEnabled = !isSelectionEnabled;
    
    try {
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'toggleSelection',
        enabled: isSelectionEnabled
      });
      
      updateSelectionButtonText();
      showToast(isSelectionEnabled ? '已开启选中文本添加功能' : '已关闭选中文本添加功能');
    } catch (error) {
      console.error('切换选中文本添加功能失败:', error);
      showToast('操作失败', 'error');
    }
  }
  
  // 检查选中文本添加功能状态
  async function checkSelectionFeatureStatus() {
    try {
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
      const data = await storageManager.exportData();
      
      // 创建数据URL
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const dataUrl = URL.createObjectURL(dataBlob);
      
      // 创建下载链接并触发点击
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `chrome-memo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadLink.click();
      
      // 释放URL
      setTimeout(() => URL.revokeObjectURL(dataUrl), 100);
      
      showToast('导出成功');
    } catch (error) {
      console.error('导出数据失败:', error);
      showToast('导出数据失败', 'error');
    }
  }
  
  // 导入数据
  function importData() {
    // 触发文件选择
    fileInput.click();
  }
  
  // 处理文件选择后的导入操作
  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          // 解析JSON数据
          const data = JSON.parse(e.target.result);
          
          // 确认导入
          if (confirm('导入将覆盖当前所有备忘录和模板数据，确定要继续吗？')) {
            await storageManager.importData(data);
            
            // 更新状态和列表
            await checkCurrentSiteMemo();
            await loadSavedSites();
            
            showToast('导入成功');
          }
        } catch (parseError) {
          console.error('解析导入文件失败:', parseError);
          showToast('无效的备份文件格式', 'error');
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
  
  // 添加事件监听
  toggleMemoBtn.addEventListener('click', toggleMemo);
  openEditorBtn.addEventListener('click', openEditor);
  toggleSelectionBtn.addEventListener('click', toggleSelectionFeature);
  exportDataBtn.addEventListener('click', exportData);
  importDataBtn.addEventListener('click', importData);
  fileInput.addEventListener('change', handleFileSelect);
  
  // 初始化
  initPopup();
}); 