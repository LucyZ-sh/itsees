# Itsees 公开 Beta 资产权利记录设计

## 1. 背景与结论

Itsees `0.1.0-beta.1` 已生成可审阅的 Apple Silicon DMG，但发布资产清单仍将 Core、Atlas 与 Music 标记为 `redistribution: unconfirmed`。在公开 GitHub Release、官网未签名 Beta 下载或 Homebrew Cask 之前，需要把项目所有者的权利确认固化为可重复生成、可测试、可随发布包交付的记录。

项目所有者 Lucy Zhang 于 2026-08-01 确认：

- 所有项目生成图片均通过本人账号生成或由本人创作；
- 安装包没有直接包含网上照片、图库素材、第三方角色 IP 或第三方音乐；
- Wikimedia/Wikipedia 图片只用于研究参考，不进入发布包；
- 210 个背景音乐文件由本人账号通过 ChatCut 生成，没有混入第三方音频文件。

本设计记录项目所有者的事实声明和发布依据，不构成第三方法律意见。

## 2. 目标

1. 将 Core、Atlas 与 Music 的公开再分发状态改为有依据的 `confirmed`。
2. 让权利确认从源代码生成，而不是只手工修改一次生成文件。
3. 为 GitHub Release 与下载者提供一份简洁、公开的 `ASSET-NOTICE.md`。
4. 用自动测试防止将来重新构建时丢失确认人、日期或权利依据。
5. 将同一声明同步到当前 Release Candidate，避免候选包与仓库记录不一致。

## 3. 采用方案

采用分组权利账本，而不是单句声明或逐文件登记。

权利账本按 Core、Atlas、Music 三组记录：

- `sourceType`：素材形成方式；
- `source`：项目内来源说明；
- `externalReferences`：是否使用过外部参考，以及是否被打包；
- `rightsBasis`：公开再分发的事实依据；
- `redistribution`：固定为 `confirmed`；
- `confirmedBy`：`Lucy Zhang`；
- `confirmedAt`：`2026-08-01`；
- `notes`：该组特有的限制或说明。

本次不伪造逐文件生成历史。`asset-manifest.json` 继续负责逐文件路径、字节数和 SHA-256；`provenance.json` 负责分组来源与权利依据。

## 4. 源文件与生成物

### 4.1 生成源

修改 `scripts/build-release-assets.mjs` 中的 provenance 模板，使后续运行 `pnpm assets:build` 时持续生成已确认记录。

### 4.2 当前生成物

同步更新：

- `final-repos/release-assets/provenance.json`
- `release-candidates/itsees-app-0.1.0-beta.1/ASSET-NOTICE.md`

`final-repos/release-assets/provenance.json` 是当前外部分发资产包的审计记录。修改它是本次明确授权的发布资产工作，但源模板仍是长期事实来源。

### 4.3 公开声明

在 Itsees App 仓库根目录新增 `ASSET-NOTICE.md`。GitHub Release 应将它与 DMG、SHA256SUMS 一起提供。声明使用英文为主并附简明中文说明，包含：

- 产品资产的创作与生成归属；
- 三类资产的来源摘要；
- 外部参考图未进入安装包；
- 没有直接打包第三方照片、图库、角色 IP 或音乐；
- ChatCut 生成音乐的官方商业发布依据链接与核对日期；
- 权利问题联系入口暂使用 GitHub Release/仓库 issue，不公开个人邮箱。

## 5. 分组记录

### Core

- 包含 Phase 1 主题、宠物、旅行包、纪念品、地图及其运行时衍生文件。
- 权利依据：Lucy Zhang 本人创作或通过本人控制的生成账号生成。
- 不包含直接下载的网上照片、图库素材或第三方角色 IP。

### Atlas

- 包含 15 个目的地的项目生成插画和图像世界素材。
- Wikimedia/Wikipedia 资料仅用于地标研究和视觉事实参考；参考照片目录不进入 Electron `files` 范围和发布资产包。
- 权利依据：最终用户可见作品为项目生成插画，由 Lucy Zhang 确认可公开再分发。

### Music

- 包含 30 个目的地、7 种天气状态，共 210 个 MP3。
- 由 Lucy Zhang 控制的账号通过 ChatCut 生成，无第三方音频文件被直接混入。
- ChatCut 当前公开说明允许合法商业内容，并将 AI 生成音乐描述为原创、免版税、可发布；声明记录核对日期但不把平台条款复制进仓库。

## 6. 自动校验

新增窄范围测试，验证：

1. provenance 模板不再包含 `redistribution: unconfirmed`；
2. 三组均为 `confirmed`；
3. 三组均包含 `confirmedBy: Lucy Zhang` 与 `confirmedAt: 2026-08-01`；
4. 每组都有非空 `rightsBasis`；
5. 根目录 `ASSET-NOTICE.md` 包含 Core、Atlas、Music、第三方排除项和 ChatCut 依据；
6. Electron 的 `files` 配置没有纳入 Phase 2 参考照片目录。

测试加入现有 `node --test tests/*.test.mjs` 流程，不引入新依赖。

## 7. Release Candidate 同步

当前候选目录新增 `ASSET-NOTICE.md`，并保留现有 DMG 与 SHA256SUMS 不变。本步骤只补充权利记录，不重新打包、签名或改变 DMG 字节，因此现有 DMG SHA-256 仍为：

`e22075750b01cf26f0c6c106fbdc1870c94cb0932c27605d27e5b80b1e542f42`

正式签名或重新构建 DMG 后必须再次计算 SHA-256。

## 8. Git 与隐私

- 后续提交作者使用 `Lucy Zhang <zlqlucy93@gmail.com>`，由用户明确提供并授权使用。
- `ASSET-NOTICE.md` 不额外展示个人邮箱，避免在发行资产中重复暴露联系方式。
- Git 提交元数据会包含该邮箱；这是公开仓库提交历史的一部分。

## 9. 不在本次范围

- 创建或上传 GitHub Release；
- 修改官网的公开下载 URL；
- Developer ID 签名、Apple 公证或 DMG 替换；
- 对 AI 生成作品在各司法辖区的版权可保护性作法律结论；
- 为 1086 个现有文件补写无法验证的逐文件生成时间和账号日志。

上述发布步骤将在权利记录实施并通过测试后，作为下一阶段继续推进。

## 10. 验收标准

- 源生成器、当前 provenance、公开声明和 Release Candidate 相互一致；
- 项目测试通过，且新增测试能阻止状态退回 `unconfirmed`；
- `git diff --check` 无格式错误；
- 不修改当前 DMG，也不改变现有 SHA256SUMS；
- 权利声明准确反映 Lucy Zhang 本次确认，不增加未经确认的事实。
