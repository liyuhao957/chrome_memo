/**
 * 模板管理器 - 业务逻辑层
 * 负责模板的操作和应用
 */

import { templateStore } from '../data/template-store.js';

class TemplateManager {
  /**
   * 获取所有模板列表
   * @returns {Promise<Array>} - 模板对象数组
   */
  async getTemplateList() {
    return await templateStore.getTemplateList();
  }
  
  /**
   * 保存模板
   * @param {string} name - 模板名称
   * @param {string} content - 模板内容
   * @returns {Promise<Object>} - 保存结果
   */
  async saveTemplate(name, content) {
    if (!name || !content) {
      throw new Error('模板名称和内容不能为空');
    }
    
    return await templateStore.saveTemplate(name, content);
  }
  
  /**
   * 获取模板内容
   * @param {string} name - 模板名称
   * @returns {Promise<string|null>} - 模板内容或null
   */
  async getTemplateContent(name) {
    const template = await templateStore.getTemplate(name);
    return template ? template.content : null;
  }
  
  /**
   * 删除模板
   * @param {string} name - 模板名称
   * @returns {Promise<boolean>} - 删除成功返回true
   */
  async deleteTemplate(name) {
    return await templateStore.deleteTemplate(name);
  }
  
  /**
   * 将当前备忘录内容保存为模板
   * @param {string} content - 备忘录内容
   * @param {string} name - 模板名称
   * @returns {Promise<Object>} - 保存结果
   */
  async saveContentAsTemplate(content, name) {
    if (!content) {
      throw new Error('备忘录内容不能为空');
    }
    
    if (!name) {
      // 自动生成模板名称
      const date = new Date();
      name = `模板_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    return await this.saveTemplate(name, content);
  }
  
  /**
   * 更新模板顺序
   * @param {Array<string>} nameOrder - 模板名称的有序数组
   * @returns {Promise<boolean>} - 更新成功返回true
   */
  async updateTemplateOrder(nameOrder) {
    return await templateStore.updateTemplateOrder(nameOrder);
  }
  
  /**
   * 搜索模板
   * @param {string} query - 搜索关键词
   * @returns {Promise<Array>} - 匹配的模板列表
   */
  async searchTemplates(query) {
    if (!query) {
      return await this.getTemplateList();
    }
    
    const templates = await this.getTemplateList();
    const lowerQuery = query.toLowerCase();
    
    return templates.filter(template => 
      template.name.toLowerCase().includes(lowerQuery) || 
      template.content.toLowerCase().includes(lowerQuery)
    );
  }
}

// 导出单例实例
export const templateManager = new TemplateManager(); 