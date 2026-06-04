# 书签导航浏览器扩展 - 需求规格

## 项目概述
将 Chrome/Edge 浏览器的书签收藏夹，制作成一个美观的网址导航页面的浏览器扩展。

## 技术栈
- 框架：WXT 0.20+ (已初始化，React 模板)
- UI：React 19 + Tailwind CSS v4
- 语言：TypeScript
- 图标：使用 `chrome://favicon/size/32@1x/{url}` 获取网站图标（扩展内可用，无限流）

## 功能需求

### MVP（必须实现）

1. **覆盖新标签页**
   - 用导航页替换浏览器默认新标签页
   - 入口：`entrypoints/newtab/index.html`

2. **读取书签树**
   - 使用 `chrome.bookmarks.getTree()` 获取所有书签
   - 解析为扁平结构：[{title, url, folderPath, dateAdded}]

3. **按文件夹分组展示**
   - 侧边栏显示文件夹树（可折叠）
   - 主区域显示当前选中文件夹的书签
   - 默认显示"书签栏"下的内容

4. **书签卡片网格**
   - 每个卡片：favicon + 标题 + URL 截断显示
   - 响应式网格：手机2列，平板3-4列，桌面5-6列
   - 点击在当前标签页跳转（非新标签页）

5. **搜索过滤**
   - 顶部搜索栏，实时过滤书签
   - 按标题和 URL 模糊匹配
   - 搜索时显示所有文件夹的匹配结果

6. **弹窗快速搜索**（保留模板自带的 popup）
   - popup 中显示搜索框
   - 输入即时过滤，点击跳转

### 布局设计

```
┌─────────────────────────────────────────────┐
│  🔍 搜索栏                          [设置]  │
├──────────┬──────────────────────────────────┤
│ 侧边栏    │                                  │
│          │  ┌──────┐ ┌──────┐ ┌──────┐     │
│ 📁 书签栏 │  │ fav  │ │ fav  │ │ fav  │     │
│   常用工具 │  │ 标题  │ │ 标题  │ │ 标题  │     │
│   学习资料 │  └──────┘ └──────┘ └──────┘     │
│   娱乐    │  ┌──────┐ ┌──────┐ ┌──────┐     │
│          │  │ fav  │ │ fav  │ │ fav  │     │
│ 📁 其他   │  │ 标题  │ │ 标题  │ │ 标题  │     │
│          │  └──────┘ └──────┘ └──────┘     │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

### 样式要求
- 使用 Tailwind CSS
- 默认深色主题（深灰背景 #1a1a2e，卡片 #16213e）
- 圆角卡片，hover 时微微放大 + 阴影
- 搜索栏半透明毛玻璃效果
- 文件夹选中高亮

### 文件结构

```
entrypoints/
├── background.ts          # 已有，保持不动（或删除）
├── content.ts             # 已有，删除
├── newtab/
│   ├── index.html         # 新标签页入口
│   ├── main.tsx           # React 挂载
│   └── App.tsx            # 主组件
├── popup/
│   ├── index.html         # 弹窗入口（保留模板）
│   ├── main.tsx
│   └── App.tsx
└── components/
    ├── Sidebar.tsx        # 文件夹侧边栏
    ├── BookmarkGrid.tsx   # 书签网格
    ├── BookmarkCard.tsx   # 单个书签卡片
    ├── SearchBar.tsx      # 搜索栏
    └── favicon.ts         # favicon URL 生成工具
```

### wxt.config.ts 配置

需要添加：
```ts
manifest: {
  permissions: ['bookmarks'],
  chrome_url_overrides: {
    newtab: 'newtab.html'
  }
}
```

### 类型定义

```ts
interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  folderPath: string[];  // ['书签栏', '常用工具']
  dateAdded: number;
}

interface FolderNode {
  id: string;
  title: string;
  children: FolderNode[];
  bookmarkCount: number;
}
```

### 注意事项
- 用 `chrome://favicon/size/32@1x/{url}` 获取 favicon，不依赖外部 API
- 书签可能有几千个，网格用 CSS grid，不做虚拟滚动（MVP 够用）
- 搜索用简单 includes 匹配即可，不需要模糊搜索库
- 不需要后端，纯前端扩展
- 深色主题配色参考：bg=#0f0f1a, sidebar=#1a1a2e, card=#16213e, accent=#667eea
