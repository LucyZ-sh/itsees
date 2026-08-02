# Itsees 未签名 Beta 官网发布设计

- 日期：2026-08-01
- 状态：用户已批准“官网 + GitHub Releases 未签名 Beta + 安装指引 + SHA-256”方向，等待书面复核
- 版本：`0.1.0-beta.1`
- 发布页：`https://github.com/LucyZ-sh/itsees/releases/tag/v0.1.0-beta.1`

## 目标

把已确认的手帐风格官网从“Beta 即将开放”切换为可公开下载的未签名 Beta 页面。访客必须在下载前看见未签名状态、平台限制和校验值，并能用中英文完成安全安装。官网先发布到 GitHub Pages，后续绑定 `itsees.app` 时不改变下载地址或页面结构。

## 方案比较与选择

采用“官网直达 DMG + 就地风险说明”的方案：主按钮直接下载固定版本 DMG，旁边提供 Release 页面和校验文件。它的下载路径最短，同时保留完整透明度。

未选择：

1. 主按钮只进入 GitHub Release：维护最简单，但用户需要再次寻找正确资产。
2. 继续保持 Coming soon：风险最低，但不满足已经批准的公开 Beta 目标。

## 页面与交互

现有视觉、Logo、双语切换和内容顺序保持不变，只增加发布信息：

1. 首屏 CTA 改为 `Download unsigned beta` / `下载未签名 Beta`。
2. CTA 下方显示 `macOS · Apple Silicon · Unsigned & not notarized` 及中文版。
3. 新增紧凑的安装区，包含下载、核验 SHA-256、拖入 Applications、在系统设置中选择 Open Anyway 四步。
4. 显示可复制的完整 SHA-256：
   `e22075750b01cf26f0c6c106fbdc1870c94cb0932c27605d27e5b80b1e542f42`。
5. 提供 GitHub Release、`SHA256SUMS` 和源码仓库链接。
6. 不提供 `xattr`、关闭 Gatekeeper 或其他命令行绕过方式。

下载按钮使用不可变版本地址：

`https://github.com/LucyZ-sh/itsees/releases/download/v0.1.0-beta.1/Itsees-0.1.0-beta.1-arm64.dmg`

## 配置边界

`site/site-config.js` 继续作为发布状态唯一来源，新增或填写：

- `downloadEnabled: true`
- 固定版本 `downloadUrl`
- `releaseUrl`
- `checksumUrl`
- `githubUrl`
- `version`
- `sha256`
- `signed: false`

页面脚本只读取配置并更新链接、版本、校验值和未签名状态。无效或非 HTTPS 下载地址时，按钮必须自动回退为不可用，避免产生空链接。

## 托管

第一阶段使用 GitHub Pages 临时地址 `https://lucyz-sh.github.io/itsees/`。仓库根入口负责进入现有 `site/` 官网，Pages 从 `main` 分支发布。将来绑定 `itsees.app` 时，只更新 Pages 自定义域和 canonical 配置，不改变 Release 资产 URL。

## 验证

自动测试覆盖：

- 下载开关已启用且 URL 为 HTTPS 固定版本地址；
- 中英文都明确包含未签名、未公证、Apple Silicon 和 Open Anyway 信息；
- 页面显示的 SHA-256 与 GitHub Release 的 DMG digest 一致；
- Release、校验文件和源码链接完整；
- 语言切换后安装步骤和按钮同步更新；
- 禁止出现关闭 Gatekeeper 或移除 quarantine 的命令。

发布后使用真实浏览器检查桌面端与移动端布局、所有链接和 GitHub Pages 公开可访问性。DMG 不在网站仓库中复制存储，始终由 GitHub Release 提供。

## 非目标

- 不签名、不公证或重新构建本次 DMG；
- 不提交官方 Homebrew Cask；
- 不在此步骤提交 Product Hunt；
- 不改变已确认的官网整体视觉方向；
- 不公开个人邮箱、证书、令牌或本机路径。
