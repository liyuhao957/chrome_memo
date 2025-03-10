# 网站备忘录 Chrome 扩展

一个简单易用的Chrome扩展，用于在不同网站上创建、管理和显示备忘录。

## 功能特点

- 在任何网站上创建和显示备忘录
- 可拖拽定位备忘录
- 富文本编辑功能
- 模板系统支持快速填充内容
- 选中文本可快速添加到备忘录
- 支持数据导入导出
- 快捷键支持

## 快捷键

- `Alt+M` (Windows/Linux) / `Option+M` (Mac): 显示/隐藏备忘录
- `Alt+E` (Windows/Linux) / `Option+E` (Mac): 打开备忘录编辑器
- `Alt+Q` (Windows/Linux) / `Option+Q` (Mac): 开启/关闭选中文本添加功能

## 使用方法

1. 安装扩展后，点击工具栏上的扩展图标打开弹出窗口
2. 在任意网站上，点击"创建备忘录"按钮创建备忘录
3. 使用拖拽功能调整备忘录位置
4. 点击编辑按钮打开富文本编辑器编辑内容
5. 使用模板功能快速填充常用内容
6. 可以开启选中文本添加功能，选中页面上的文本快速添加到备忘录

## 数据管理

- 点击弹出窗口中的"导出数据"按钮导出所有备忘录和模板数据
- 点击"导入数据"按钮导入之前导出的数据备份
- 点击"模板管理"链接进入模板管理页面，创建、编辑和管理模板

## 项目结构

```
src/
├── assets/                  # 静态资源
│   └── icons/               # 图标文件
├── data/                    # 数据层
│   ├── storage.js           # 数据存储管理
│   └── template-store.js    # 模板数据管理
├── ui/                      # 表现层
│   ├── components/          # UI组件
│   │   ├── memo.js          # 备忘录组件
│   │   ├── editor.js        # 编辑器组件
│   │   └── template-list.js # 模板列表组件
│   ├── styles/              # 样式文件
│   │   ├── memo.css         # 备忘录样式
│   │   ├── popup.css        # 弹窗样式
│   │   └── templates.css    # 模板页面样式
│   └── utils/               # UI工具函数
│       └── drag-utils.js    # 拖拽功能工具
├── core/                    # 业务逻辑层
│   ├── memo-manager.js      # 备忘录管理
│   ├── template-manager.js  # 模板管理
│   └── selection-utils.js   # 文本选择相关功能
├── background.js            # 扩展后台脚本
├── content.js               # 内容脚本
├── popup.html               # 弹出窗口HTML
├── popup.js                 # 弹出窗口脚本
├── templates.html           # 模板管理页面
├── templates.js             # 模板管理脚本
└── manifest.json            # 扩展清单文件
```

## 开发者信息

本扩展采用模块化设计，遵循清晰的分层架构，便于维护和扩展。 