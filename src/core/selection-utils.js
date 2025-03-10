/**
 * 文本选择工具类
 * 处理网页上的文本选择相关功能
 */

class SelectionUtils {
  constructor() {
    this.isSelectionFeatureEnabled = false;
    this.selectionPopup = null;
  }
  
  /**
   * 初始化文本选择处理
   * @param {Function} addToMemoCallback - 添加选中文本到备忘录的回调函数
   */
  initialize(addToMemoCallback) {
    this.addToMemoCallback = addToMemoCallback;
    this.createSelectionPopup();
    
    // 添加文本选择事件监听
    document.addEventListener('mouseup', this.handleSelection.bind(this));
    document.addEventListener('mousedown', this.hideSelectionPopup.bind(this));
  }
  
  /**
   * 创建选中文本弹出框
   */
  createSelectionPopup() {
    if (this.selectionPopup) return;
    
    this.selectionPopup = document.createElement('div');
    this.selectionPopup.className = 'chrome-memo-selection-popup';
    this.selectionPopup.style.display = 'none';
    
    const addButton = document.createElement('button');
    addButton.className = 'add-to-memo-btn';
    addButton.textContent = '添加到备忘录';
    addButton.addEventListener('click', () => this.addSelectionToMemo());
    
    this.selectionPopup.appendChild(addButton);
    document.body.appendChild(this.selectionPopup);
  }
  
  /**
   * 处理文本选择事件
   * @param {Event} event - 鼠标事件
   */
  handleSelection(event) {
    // 如果功能未启用，不处理
    if (!this.isSelectionFeatureEnabled) return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText) {
      // 获取选择的范围和位置
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // 显示弹出框在选择文本上方
      this.showSelectionPopup(
        rect.left + window.scrollX + (rect.width / 2),
        rect.top + window.scrollY - 10
      );
    } else {
      this.hideSelectionPopup();
    }
  }
  
  /**
   * 显示选择文本弹出框
   * @param {number} x - 水平位置
   * @param {number} y - 垂直位置
   */
  showSelectionPopup(x, y) {
    if (!this.selectionPopup) return;
    
    this.selectionPopup.style.left = `${x}px`;
    this.selectionPopup.style.top = `${y}px`;
    this.selectionPopup.style.display = 'block';
  }
  
  /**
   * 隐藏选择文本弹出框
   */
  hideSelectionPopup() {
    if (this.selectionPopup) {
      this.selectionPopup.style.display = 'none';
    }
  }
  
  /**
   * 添加选中文本到备忘录
   */
  addSelectionToMemo() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && this.addToMemoCallback) {
      this.addToMemoCallback(selectedText);
      this.showAddedToast();
    }
    
    this.hideSelectionPopup();
  }
  
  /**
   * 显示已添加提示
   */
  showAddedToast() {
    let toast = document.querySelector('.chrome-memo-toast');
    
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'chrome-memo-toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = '已添加到备忘录';
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }
  
  /**
   * 启用/禁用选中文本添加功能
   * @param {boolean} enabled - 是否启用
   */
  toggleSelectionFeature(enabled) {
    this.isSelectionFeatureEnabled = enabled;
    
    if (!enabled && this.selectionPopup) {
      this.hideSelectionPopup();
    }
  }
  
  /**
   * 清理资源，移除事件监听
   */
  destroy() {
    document.removeEventListener('mouseup', this.handleSelection.bind(this));
    document.removeEventListener('mousedown', this.hideSelectionPopup.bind(this));
    
    if (this.selectionPopup) {
      document.body.removeChild(this.selectionPopup);
      this.selectionPopup = null;
    }
  }
}

// 创建全局单例实例
window.selectionUtils = new SelectionUtils(); 