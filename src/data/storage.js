/**
 * 备忘录数据存储管理
 * 提供统一的数据存储、读取和同步接口
 */

class StorageManager {
  /**
   * 保存备忘录数据
   * @param {string} domain - 网站域名
   * @param {Object} data - 备忘录数据对象
   * @returns {Promise} - 保存结果的Promise
   */
  async saveMemo(domain, data) {
    try {
      // 先获取所有备忘录数据
      const allMemos = await this.getAllMemos();
      
      // 添加或更新当前域名的备忘录
      allMemos[domain] = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      // 保存回存储
      return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ memos: allMemos }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(allMemos[domain]);
          }
        });
      });
    } catch (error) {
      console.error('保存备忘录失败:', error);
      throw error;
    }
  }
  
  /**
   * 读取指定域名的备忘录数据
   * @param {string} domain - 网站域名
   * @returns {Promise<Object|null>} - 备忘录数据对象或null
   */
  async getMemo(domain) {
    try {
      const allMemos = await this.getAllMemos();
      return allMemos[domain] || null;
    } catch (error) {
      console.error('读取备忘录失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取所有备忘录数据
   * @returns {Promise<Object>} - 所有备忘录数据的对象，以域名为键
   */
  async getAllMemos() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get('memos', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.memos || {});
        }
      });
    });
  }
  
  /**
   * 删除指定域名的备忘录
   * @param {string} domain - 要删除备忘录的域名
   * @returns {Promise<boolean>} - 删除成功返回true
   */
  async deleteMemo(domain) {
    try {
      const allMemos = await this.getAllMemos();
      
      if (!allMemos[domain]) {
        return false; // 不存在该域名的备忘录
      }
      
      // 删除指定域名的备忘录
      delete allMemos[domain];
      
      // 保存回存储
      return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ memos: allMemos }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('删除备忘录失败:', error);
      throw error;
    }
  }
  
  /**
   * 导出所有备忘录数据
   * @returns {Promise<Object>} - 包含所有数据的对象
   */
  async exportData() {
    try {
      // 获取所有备忘录数据
      const memos = await this.getAllMemos();
      
      // 获取所有模板数据
      const templates = await new Promise((resolve, reject) => {
        chrome.storage.sync.get('templates', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result.templates || {});
          }
        });
      });
      
      // 返回包含所有数据的对象
      return {
        memos,
        templates,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
    } catch (error) {
      console.error('导出数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 导入备忘录和模板数据
   * @param {Object} data - 要导入的数据对象
   * @returns {Promise<boolean>} - 导入成功返回true
   */
  async importData(data) {
    try {
      // 验证数据格式
      if (!data || !data.memos || !data.templates) {
        throw new Error('导入数据格式无效');
      }
      
      // 导入备忘录数据
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ memos: data.memos }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      
      // 导入模板数据
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ templates: data.templates }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      throw error;
    }
  }
}

// 创建全局单例实例
window.storageManager = new StorageManager();

// 为了兼容不同环境，避免使用export语句 