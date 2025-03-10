/**
 * 备忘录管理器 - 业务逻辑层
 * 处理备忘录的创建、更新、删除等核心操作
 */

import { storageManager } from '../data/storage.js';

class MemoManager {
  /**
   * 获取当前页面的域名
   * @returns {string} - 当前页面的域名
   */
  getCurrentDomain() {
    return window.location.hostname;
  }
  
  /**
   * 加载当前网站的备忘录
   * @returns {Promise<Object|null>} - 备忘录数据或null
   */
  async loadCurrentMemo() {
    const domain = this.getCurrentDomain();
    return await storageManager.getMemo(domain);
  }
  
  /**
   * 保存备忘录内容
   * @param {string} content - 备忘录内容
   * @param {Object} options - 可选参数对象
   * @param {Object} options.position - 备忘录位置 {x, y}
   * @param {boolean} options.isVisible - 备忘录是否可见
   * @returns {Promise<Object>} - 保存后的备忘录数据
   */
  async saveMemo(content, options = {}) {
    const domain = this.getCurrentDomain();
    const currentMemo = await this.loadCurrentMemo() || {};
    
    // 合并当前数据和新数据
    const memoData = {
      content,
      position: options.position || currentMemo.position || { x: 20, y: 20 },
      isVisible: options.isVisible !== undefined ? options.isVisible : (currentMemo.isVisible || true),
      createdAt: currentMemo.createdAt || new Date().toISOString(),
      url: window.location.href,
      title: document.title
    };
    
    return await storageManager.saveMemo(domain, memoData);
  }
  
  /**
   * 更新备忘录位置
   * @param {Object} position - 新位置 {x, y}
   * @returns {Promise<Object>} - 更新后的备忘录数据
   */
  async updateMemoPosition(position) {
    const memo = await this.loadCurrentMemo();
    if (!memo) return null;
    
    memo.position = position;
    return await storageManager.saveMemo(this.getCurrentDomain(), memo);
  }
  
  /**
   * 设置备忘录可见性
   * @param {boolean} isVisible - 是否可见
   * @returns {Promise<Object>} - 更新后的备忘录数据
   */
  async setMemoVisibility(isVisible) {
    const memo = await this.loadCurrentMemo();
    if (!memo) return null;
    
    memo.isVisible = isVisible;
    return await storageManager.saveMemo(this.getCurrentDomain(), memo);
  }
  
  /**
   * 删除当前网站的备忘录
   * @returns {Promise<boolean>} - 删除成功返回true
   */
  async deleteCurrentMemo() {
    return await storageManager.deleteMemo(this.getCurrentDomain());
  }
  
  /**
   * 添加选中内容到备忘录
   * @param {string} selectedText - 选中的文本内容
   * @returns {Promise<Object>} - 更新后的备忘录数据
   */
  async addSelectionToMemo(selectedText) {
    if (!selectedText) return null;
    
    const memo = await this.loadCurrentMemo();
    let content = '';
    
    if (memo && memo.content) {
      // 如果已有内容，在末尾添加选中内容
      content = memo.content + '\n\n' + selectedText;
    } else {
      // 创建新备忘录
      content = selectedText;
    }
    
    return await this.saveMemo(content);
  }
  
  /**
   * 获取所有网站的备忘录列表
   * @returns {Promise<Array>} - 备忘录数据数组
   */
  async getAllMemosList() {
    const allMemos = await storageManager.getAllMemos();
    
    return Object.keys(allMemos).map(domain => ({
      domain,
      content: allMemos[domain].content,
      url: allMemos[domain].url,
      title: allMemos[domain].title,
      updatedAt: allMemos[domain].updatedAt || allMemos[domain].createdAt,
      createdAt: allMemos[domain].createdAt
    }));
  }
}

// 导出单例实例
export const memoManager = new MemoManager(); 