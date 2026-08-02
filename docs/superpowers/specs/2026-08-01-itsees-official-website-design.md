# Itsees 官方网站设计

- 日期：2026-08-01
- 状态：视觉与技术方案已确认，等待书面复核
- 目标：为 Product Hunt 与后续 Homebrew Cask 发布提供官方产品主页
- 位置：`site/`
- 默认语言：英语
- 辅助语言：简体中文
- 视觉方向：Open Travel Journal

## 1. 目标

在 Itsees App 发布仓中创建一个独立、无后端依赖的静态官方网站。页面应让首次访问者在短时间内理解：

1. Itsees 是一款会替用户旅行的桌面宠物。
2. 用户选择路线和行囊后，旅程会逐步点亮地图。
3. 桌宠会带回明信片、纪念品和旅行记录。
4. 产品本地优先，当前 Beta 面向 Apple Silicon Mac。

官网是 App 的产品入口，不嵌入 App 运行时、不读取旅行存档，也不采集访客数据。

## 2. 已选技术方案

采用发布仓内的独立静态站点：

```text
site/
├── index.html
├── styles.css
├── site.js
├── site-config.js
└── assets/
```

选择理由：

- 与 App 同版本管理，但不依赖 Electron 或 App 状态。
- 可直接部署到 GitHub Pages、Cloudflare Pages、Netlify 或普通静态主机。
- Product Hunt、Homebrew Cask 和社交分享使用同一稳定主页。
- 签名后只需更新站点配置中的下载 URL，不重写页面结构。

不采用：

- 复用 App 页面运行时：会引入存档、状态和桌面桥接耦合。
- 独立官网仓库：当前页面规模不足以抵消额外发布与同步成本。

## 3. 视觉系统

官网直接继承 App Warm Journal 主题，而不是在普通营销页上叠加手帐装饰。

核心令牌：

- 墨色：`#2e392f`
- 次级文字：`#596159`
- 纸张：`#f4eee2`
- 强纸张：`#fbf7ed`
- 桌面底色：`#e7dece`
- 森林绿：`#244b3b`
- 赤陶红：`#9b4f3b`
- 细线：`#c8bda9`
- 展示字体：Georgia、中文宋体回退
- 界面字体：Avenir Next、系统无衬线回退

形态规则：

- 以薄边线、直角或小圆角、纸张层级和克制阴影为主。
- 避免大面积霓虹渐变、玻璃拟态、胶囊按钮和通用 SaaS 卡片墙。
- 邮戳、胶带、路线索引和批注只承担信息角色，不作为无意义装饰。
- 动画以翻页、轻微漂浮和渐入为限，并尊重 `prefers-reduced-motion`。

## 4. 页面结构

### 4.1 顶部导航

- Itsees 品牌字标与 `Pet Travel Journal` 副标。
- 锚点：Journey、Atlas、Keepsakes。
- 语言切换：`EN / 中文`。
- 桌面端保持横向；移动端折叠为简洁双行布局，不使用汉堡菜单。

### 4.2 首屏：打开一本旅行手帐

桌面端呈现左右跨页：

- 左页：Field Note 标签、主标题、产品说明、Beta CTA 与平台说明。
- 右页：真实巴黎旅行图、邮戳、日期、目的地便签和路线数量。
- 中央用克制的书脊阴影表达跨页，不模拟厚重 3D 书本。

英文主标题：`A little traveler for your long days.`

中文主标题：`漫长日常里，一位小小旅行家。`

CTA 固定显示 `Beta · Coming soon` / `Beta · 即将开放`。在 `site-config.js` 中只有当 `downloadEnabled` 为 `true` 且 `downloadUrl` 为有效 HTTPS 地址时才成为下载链接。

### 4.3 Journey

使用四步路线说明：

1. Choose a route.
2. Pack two small things.
3. Let the journey unfold.
4. Open what came home.

桌面端像手帐中的四段时间轴；移动端为单列路线记录。说明真实的四小时完整旅程、一期每二十分钟和二期每六十分钟解锁节奏。

### 4.4 Atlas

- 使用真实一期路线图和二期世界地图。
- 以左右页签展示 `Storybook routes` 与 `Real-world atlas`。
- 说明 15 条一期路线与 15 个二期真实目的地。
- 不提供可交互地图浏览器，避免复制 App 功能。

### 4.5 Keepsakes

- 使用真实相册、明信片和纪念品截图。
- 页面结构模拟归档页：Postcards、Souvenirs、Travel history。
- 强调所有收藏来自真实完成或召回的旅行结果。

### 4.6 Local-first

用短说明清楚表达：

- 旅行数据保存在本地。
- 天气定位需要用户明确同意。
- 官网不读取用户 App 数据。
- Codex companion 是可选本地能力。

### 4.7 最终 CTA 与页脚

- 重复 Beta 状态与 Apple Silicon 范围。
- 提供 Product、Privacy、Support 和 GitHub 链接槽位。
- 在公开部署前，Privacy 与 Support 必须替换为真实可访问链接；未配置时不渲染链接，不显示失效占位符。

## 5. 多语言

- HTML 中保留可索引的英文默认内容。
- `site.js` 使用集中式翻译对象切换所有可见文案和可访问标签。
- 初次访问默认英语；若浏览器首选语言以 `zh` 开头则默认中文。
- 用户手动选择写入 `localStorage`，键名限定为 `itsees-site-language`。
- 更新 `<html lang>`、页面标题、description 和 Open Graph locale。
- 不自动翻译产品专有名词、路线 ID 或素材内已有文字。

## 6. 配置边界

`site-config.js` 只包含公开配置：

- `downloadEnabled`
- `downloadUrl`
- `githubUrl`
- `supportUrl`
- `privacyUrl`
- `canonicalUrl`

默认状态：下载关闭，所有尚未确认的外部链接不渲染。配置文件不得包含令牌、统计 ID 或签名信息。

## 7. 素材

官网只复制正式展示所需的小型衍生素材到 `site/assets/`：

- Teddy 品牌图。
- 巴黎主视觉。
- 一期路线图。
- 二期世界地图。
- 旅行主页、Atlas 与收藏页截图。
- 必要的明信片和纪念品小图。

不从 App 路径运行时加载，避免部署站点时遗漏资源；不复制 MP3、完整场景库、源 PNG 或未使用素材。

现有素材公开再分发仍受 `provenance.json` 控制。官网可以本地完成，但在权利状态确认前不得公开部署这些素材。

## 8. SEO 与分享

- 唯一 `h1`，其余标题保持顺序。
- 英文默认 title、description 和 Open Graph 信息。
- `og:image` 使用 Product Hunt 现有 1270×760 首图的站点副本。
- canonical 目标为 `https://itsees.app/`，正式发布前必须验证域名控制权与 HTTPS 可用性。
- 添加 `Product` 类型 JSON-LD，只声明已实现功能、macOS 平台与 Beta 状态，不声明价格、评分或下载量。

## 9. 响应式与无障碍

- 断点围绕内容自然重排，不围绕具体设备型号。
- 跨页首屏在窄屏变为连续上下两页，并保留阅读顺序。
- 所有按钮和链接有清晰焦点样式与至少 44px 触控高度。
- 图片包含准确的英文或中文 `alt`。
- 颜色对比满足 WCAG AA 文本要求。
- 语言切换支持键盘操作并声明当前语言。
- `prefers-reduced-motion` 下关闭非必要位移和漂浮动画。

## 10. 错误与降级

- JavaScript 关闭时仍显示完整英文内容、Beta 状态和主要产品信息。
- 配置缺失或下载关闭时，CTA 保持非链接状态。
- 单张展示图加载失败时保留纸张底色、标题和说明，不导致布局坍塌。
- 不使用外部字体、CDN 脚本或第三方图片源，保证离线预览稳定。

## 11. 验证

自动检查：

- HTML、CSS 与 JavaScript 基础语法。
- 所有本地资源路径存在。
- 英文和中文翻译键一致。
- 页面无绝对开发机路径。
- 未启用下载时不存在可点击的空下载链接。
- 标题层级、图片 alt、按钮标签和语言状态完整。

浏览器验证：

- 1440px 桌面、1024px 平板、390px 手机。
- 英文默认、中文自动选择、手动切换和刷新保持。
- 键盘导航、焦点顺序和减少动态效果。
- 无控制台错误、无资源 404、无横向溢出。
- Product Hunt Open Graph 图片和 metadata 可读取。

## 12. 不在本次范围

- 部署、DNS、域名购买或 Product Hunt 实际提交。
- 邮件候补名单、用户账号、支付、分析或 Cookie Banner。
- 在线更新、Homebrew 安装逻辑或未签名 DMG 下载。
- 重构 App 本体或修改旅行规则。

## 13. 验收标准

1. `site/` 可由普通静态服务器直接打开。
2. 页面视觉与已批准的 Open Travel Journal 方向一致。
3. 英文与简体中文完整切换，无遗漏文案。
4. 桌面、平板和手机布局无截断或横向滚动。
5. 所有展示素材来自真实产品或现有品牌资产。
6. 下载保持安全关闭，签名后可通过单一配置启用。
7. SEO、Open Graph、JSON-LD 和基础无障碍检查通过。
8. 页面不读取 App 状态、不采集数据、不依赖外部运行时。

