# 书签导航浏览器扩展 - 需求规格

## 项目概述
将 Chrome/Edge 浏览器的书签收藏夹，制作成一个美观的网址导航页面的浏览器扩展。

## 技术栈
- 框架：WXT 0.20+ (已初始化，React 模板)
- UI：React 19 + Tailwind CSS v4
- 语言：TypeScript
- 图标：使用 `chrome://favicon/size/32@2x/{origin}` 获取网站图标（扩展内可用，无限流，传 `new URL(url).origin`）

## 功能需求

### MVP（必须实现）

1. **覆盖新标签页**
   - 用导航页替换浏览器默认新标签页
   - 入口：`entrypoints/newtab/index.html`

2. **读取书签树**
   - 使用 `chrome.bookmarks.getTree()` 获取所有书签
   - 解析为扁平结构：[{title, url, folderPath, dateAdded}]
   - 监听书签新增、删除、修改、移动、重排事件，外部变更后自动刷新导航页数据
   - 书签刷新后自动清理常用/最近记录中的失效书签

3. **按文件夹分组展示**
   - 侧边栏显示文件夹树（可折叠）
   - 主区域显示当前选中文件夹的书签
   - 默认显示全部书签，可切换常用书签和最近打开

4. **书签卡片网格**
   - 每个卡片：favicon + 标题 + URL 截断显示
   - 使用 flex-wrap 自适应换行，卡片宽度按容器响应式收缩
   - 点击在当前标签页跳转（非新标签页）
   - 卡片菜单支持复制链接、编辑书签、删除书签
   - 编辑和删除使用应用内弹窗确认；删除会直接移除浏览器书签

5. **搜索过滤**
   - 顶部搜索栏，实时过滤书签
   - 按标题、域名、URL、文件夹路径匹配，并按相关性排序
   - 排序优先级：标题命中 > 域名命中 > URL 命中 > 文件夹路径命中；完全匹配和前缀匹配权重更高
   - 搜索时显示所有文件夹的匹配结果
   - 支持 `@文件夹 关键词` 语法，将搜索范围限定到文件夹名称匹配的书签
   - 书签无结果且设置允许时，空状态提供当前搜索引擎的网页搜索按钮

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
- 浅色主题（bg=#F6F5F3, sidebar=#FAFAF8, card=#FFFFFF, border=#E7E5E4）
- 圆角卡片，hover 时微微放大 + 阴影
- 卡片 hover 保持布局稳定，不使用位移造成视觉跳动
- favicon 加载成功时弱化图标容器背景；失败时保留浅灰兜底图标
- 搜索栏半透明毛玻璃效果（backdrop-blur）
- 文件夹选中高亮
- 设置面板按“搜索 / 展示 / 数据”分组

### 文件结构

```
entrypoints/
├── newtab/
│   ├── index.html         # 新标签页入口
│   ├── main.tsx           # React 挂载
│   ├── App.tsx            # 主组件
│   └── style.css          # Tailwind 导入 + 骨架屏动画
├── popup/
│   ├── index.html         # 弹窗入口
│   ├── main.tsx
│   ├── App.tsx
│   └── style.css
└── components/
    ├── types.ts           # BookmarkItem, FolderNode, ViewMode 类型
    ├── bookmarks.ts       # 书签树解析、过滤与相关性排序工具函数
    ├── favicon.ts         # chrome://favicon URL 生成 + 缓存
    ├── history.ts         # 书签打开历史（常用/最近）
    ├── settings.ts        # 应用设置（localStorage 持久化）
    ├── utils.ts           # simplifyUrl, openUrl 共享工具
    ├── Sidebar.tsx        # 文件夹侧边栏
    ├── BookmarkGrid.tsx   # 书签网格
    ├── BookmarkCard.tsx   # 单个书签卡片
    ├── BookmarkManageDialog.tsx # 编辑/删除书签弹窗
    ├── SearchBar.tsx      # 搜索栏（书签/网页双模式）
    └── SettingsDrawer.tsx # 设置面板
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
  folderPath: string[];    // ['书签栏', '常用工具']
  folderIdPath: string[];  // ['1', '5'] — 按 ID 匹配，避免同名文件夹冲突
  dateAdded: number;
}

interface FolderNode {
  id: string;
  title: string;
  children: FolderNode[];
  bookmarkCount: number;
}

type ViewMode = 'folder' | 'frequent' | 'recent';
```

### 注意事项
- 用 `chrome://favicon/size/32@2x/{origin}` 获取 favicon，不依赖外部 API
- 书签可能有几千个，网格用 flex-wrap 布局；当前不使用虚拟列表
- 搜索不引入模糊搜索库，使用本地权重排序：标题、域名、URL、文件夹路径；高级语法只解析前置 `@文件夹`
- 历史记录只存储常用/最近视图所需数据；书签删除或 URL 失效后自动剔除
- 书签编辑、删除等操作通过 `bookmarks.ts` 封装，不在组件中直接调用 `chrome.bookmarks`
- 不需要后端，纯前端扩展
- 浅色主题配色：bg=#F6F5F3, sidebar=#FAFAF8, card=#FFFFFF, border=#E7E5E4
