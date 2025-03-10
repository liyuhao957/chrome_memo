/**
 * 模板数据管理类
 * 负责模板的存储、检索、添加和删除等操作
 */
class TemplateStore {
  /**
   * 获取所有模板
   * @returns {Promise<Object>} - 所有模板数据对象
   */
  async getAllTemplates() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get('templates', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.templates || {});
        }
      });
    });
  }

  /**
   * 获取模板列表数组
   * @returns {Promise<Array>} - 模板对象数组，包含name和content
   */
  async getTemplateList() {
    const templates = await this.getAllTemplates();
    return Object.keys(templates).map(name => ({
      name,
      content: templates[name].content,
      createdAt: templates[name].createdAt,
      updatedAt: templates[name].updatedAt || templates[name].createdAt
    }));
  }

  /**
   * 获取指定名称的模板
   * @param {string} name - 模板名称
   * @returns {Promise<Object|null>} - 模板对象或null
   */
  async getTemplate(name) {
    const templates = await this.getAllTemplates();
    return templates[name] || null;
  }

  /**
   * 保存模板
   * @param {string} name - 模板名称
   * @param {string} content - 模板内容
   * @returns {Promise<Object>} - 保存结果
   */
  async saveTemplate(name, content) {
    try {
      if (!name || !content) {
        throw new Error('模板名称和内容不能为空');
      }

      const templates = await this.getAllTemplates();
      const now = new Date().toISOString();

      // 检查是否已存在该模板
      const isNew = !templates[name];

      // 保存或更新模板
      templates[name] = {
        content,
        createdAt: isNew ? now : templates[name].createdAt,
        updatedAt: now
      };

      // 保存回存储
      return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ templates }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve({
              name,
              content,
              createdAt: templates[name].createdAt,
              updatedAt: templates[name].updatedAt,
              isNew
            });
          }
        });
      });
    } catch (error) {
      console.error('保存模板失败:', error);
      throw error;
    }
  }

  /**
   * 删除模板
   * @param {string} name - 要删除的模板名称
   * @returns {Promise<boolean>} - 删除成功返回true
   */
  async deleteTemplate(name) {
    try {
      const templates = await this.getAllTemplates();

      if (!templates[name]) {
        return false; // 不存在该模板
      }

      // 删除模板
      delete templates[name];

      // 保存回存储
      return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ templates }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('删除模板失败:', error);
      throw error;
    }
  }

  /**
   * 更新模板顺序
   * @param {Array<string>} nameOrder - 模板名称的有序数组
   * @returns {Promise<boolean>} - 更新成功返回true
   */
  async updateTemplateOrder(nameOrder) {
    try {
      const templates = await this.getAllTemplates();
      const orderedTemplates = {};

      // 根据传入的顺序重建模板对象
      for (const name of nameOrder) {
        if (templates[name]) {
          orderedTemplates[name] = templates[name];
        }
      }

      // 加入可能没在顺序列表中的模板
      for (const name in templates) {
        if (!orderedTemplates[name]) {
          orderedTemplates[name] = templates[name];
        }
      }

      // 保存回存储
      return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ templates: orderedTemplates }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('更新模板顺序失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const templateStore = new TemplateStore(); 