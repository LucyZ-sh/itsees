# Itsees App Homebrew Cask 与 Product Hunt Beta 发布包设计

- 日期：2026-07-31
- 状态：用户已批准方案，等待书面复核
- 发布级别：未签名内部审核候选包
- 目标版本：`0.1.0-beta.1`
- 临时主页：`https://itsees.app`

## 1. 目标

从 `final-repos/itsees-app` 生成一套可供产品、品牌和技术团队共同审核的 macOS Beta 发布包。该包同时覆盖：

1. Homebrew Cask 后续提交所需的安装产物、校验值、Cask 模板和签名替换清单。
2. Product Hunt 草稿提交所需的英文与中文文案、缩略图、Gallery 图片和发布检查清单。
3. 对未签名、未公证、未取得公开素材再分发确认和尚未建立公开下载地址等限制的显式披露。

本次不发布、不上传、不创建 Homebrew PR，也不向 Product Hunt 提交草稿。

## 2. 已选方案

采用“审核优先包”：保留完整技术交付物和最小可用营销素材，使用真实应用截图与现有品牌资产，不制作演示视频、动画宣传片或新落地页。

未选择的方案：

- 完整营销包：需要额外制作视频、GIF 和落地页，超出本次 Beta 审核范围。
- 纯技术包：缺少 Product Hunt 必需的缩略图和至少两张 Gallery 图片。

## 3. 输出结构

发布包输出到原始工作区的独立交付目录，不进入 App Git 历史：

```text
release-candidates/itsees-app-0.1.0-beta.1/
├── binaries/
│   └── Itsees-0.1.0-beta.1-arm64.dmg
├── homebrew/
│   ├── itsees.rb
│   ├── README.md
│   └── SIGNING-REPLACEMENT-CHECKLIST.md
├── product-hunt/
│   ├── thumbnail-240x240.png
│   ├── gallery-01-1270x760.png
│   ├── gallery-02-1270x760.png
│   ├── gallery-03-1270x760.png
│   ├── listing-en.md
│   ├── listing-zh.md
│   └── launch-checklist.md
├── SHA256SUMS
├── RELEASE-NOTES.md
└── REVIEW-BLOCKERS.md
```

## 4. 构建与版本

- 构建源固定为 `final-repos/itsees-app` 的已审核提交。
- `package.json` 版本在发布仓中更新为 `0.1.0-beta.1`，应用名称、bundle id 和用户数据路径保持不变。
- 先运行素材验证、全量测试、Codex 插件验证和仓库卫生检查，再生成 macOS arm64 DMG。
- 不复用原始工作区 `dist/` 中的旧安装包。
- Beta DMG 不具备 Developer ID 签名或 Apple 公证，只用于内部审核。

## 5. Homebrew Cask 交付

`itsees.rb` 遵循 Homebrew Cask 的 `version`、`sha256`、`url`、`name`、`desc`、`homepage` 和 `app` 结构，并包含用户数据 `zap` 路径。

审核模板暂时使用：

- Homepage：`https://itsees.app`
- Download URL：GitHub Release 形式的明确占位地址
- Artifact：`Itsees.app`
- Architecture：Apple Silicon arm64

Cask 文件顶部使用注释说明这是审核模板，签名、公证、公开不可变下载 URL 和最终 SHA-256 完成前不得提交到 `homebrew/cask`。最终签名会改变 DMG 字节，因此签名后必须重新计算 SHA-256 并替换下载地址。

## 6. Product Hunt 素材

Product Hunt 草稿使用英语作为主提交语言，并提供中文内部复核稿。

素材规格：

- 缩略图：240×240 PNG，小于 3 MiB，首屏可清晰识别 Teddy 与 Itsees 品牌。
- Gallery：3 张 1270×760 PNG，使用真实应用画面。
- Gallery 主题依次为桌宠旅行、地图进度、明信片与纪念品。
- 不生成不存在的功能、用户评价、媒体背书、价格优惠或下载量数据。

文案包括：产品名、60 字符内英文 tagline、500 字符内英文 description、推荐标签、Maker 首条评论、中文复核译文和发布日操作清单。

Product Hunt 主 URL 暂用 `https://itsees.app`。在创建草稿前必须替换为可公开访问且能直接下载或跳转到下载页的真实地址。

## 7. 截图与视觉制作

- 优先从完成首次引导后的真实 App 状态捕获画面。
- 可使用隔离测试存档展示已有地图、明信片和纪念品，但不得修改正式默认进度或把测试入口带入发布构建。
- 视觉合成只允许添加品牌底色、短标题、边距和窗口阴影，不重绘产品 UI。
- 所有成品在输出后进行像素尺寸、文件大小和人工可读性检查。

## 8. 错误处理与安全边界

- 任一测试或素材校验失败时停止构建，不生成看似完成的候选包。
- 找不到 Apple Developer ID 是预期状态，必须在 `REVIEW-BLOCKERS.md` 中保持阻塞标记。
- 未签名 DMG 不得进入 Cask 提交流程，不提供绕过 Gatekeeper 的用户说明。
- `provenance.json` 中 Core、Atlas、Music 仍为 `redistribution: unconfirmed`；候选包仅用于权利人内部审核，不得公开上传。
- 不在包中包含证书、账号、令牌、本机日志或绝对开发路径。

## 9. 验证

App 验证：

```bash
pnpm assets:verify
pnpm test
pnpm plugin:validate
pnpm repo:check
pnpm dist:dir
pnpm dist:mac
```

发布包验证：

1. DMG 可挂载，并包含 `Itsees.app`。
2. 应用 bundle id 为 `com.itsees.app`，版本为 `0.1.0-beta.1`。
3. DMG 与交付归档的 SHA-256 可重复验证。
4. Cask 通过可用的 Homebrew 语法/样式检查；若本机没有 Homebrew，记录为待在 Homebrew CI 或审核机执行。
5. Product Hunt 缩略图和 Gallery 图尺寸、格式、体积符合要求。
6. 交付目录不包含本机私密路径、素材源文件、缓存或开发日志。

## 10. 签名后的替换流程

正式提交前：

1. 使用 Developer ID Application 对 App 及其辅助程序签名。
2. 对 DMG 完成 Apple Notarization 和 Staple。
3. 在全新 macOS 用户环境验证 Gatekeeper 接受、安装、启动和卸载。
4. 将 DMG 上传到公开、稳定、无需登录的开发者发布地址。
5. 重新计算 SHA-256，并更新 `itsees.rb` 的版本、URL 和校验值。
6. 把 `https://itsees.app` 替换为真实公开主页，完成 Cask 审计后再提交。
7. 素材再分发状态全部确认后，才可公开 Product Hunt 草稿与安装包。

## 11. 验收标准

1. 候选包目录结构与本设计一致。
2. 全量 App 测试、插件验证和仓库卫生检查通过。
3. 新构建的 arm64 DMG 可挂载且版本正确。
4. Cask 模板包含集中、明确、可操作的签名后替换项。
5. Product Hunt 至少包含一张合规缩略图和三张真实产品 Gallery 图。
6. 中英文发布文案字段完整且满足平台字符限制。
7. 所有不能公开发布的原因在根目录阻塞文件中列明。

