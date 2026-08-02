# Itsees

Itsees 是一款本地优先的 Electron 桌面旅行伴侣。桌宠替用户完成一期主题旅行和二期真实地点旅行，并带回地图进度、明信片和纪念品。

## 功能

- 15 个一期主题，每次完整旅行 240 分钟，每 20 分钟解锁一个场景。
- 15 个二期真实地点，每次完整旅行 240 分钟，每 60 分钟解锁一个场景。
- 两期共享每天 240 分钟成功打卡额度。
- 桌宠、实时天气、背景音乐、行囊、相册、纪念品和旧存档迁移。
- Electron 桌面窗口、托盘、紧凑桌宠模式和 macOS/Windows 打包。
- `plugins/itsees/` 中的 Codex 对话插件，共享本地旅行状态。

## 环境

- Node.js 22.12 或更高版本
- pnpm 11.9 或更新的 11.x 版本（与 `packageManager`、CI 保持一致）
- Python 3（仅本地静态开发服务）

## 安装

公开仓库只包含可审阅代码，不提供明文运行素材。普通贡献者可以安装依赖并运行代码测试：

```bash
pnpm install
pnpm test:code
```

授权维护者从私有 Runtime Assets Release 下载素材包后，可以执行完整安装和测试：

```bash
pnpm install
pnpm assets:install -- --source ../release-assets
pnpm assets:verify
```

大型运行素材不进入公开 Git，也不通过公开 Release 分发。素材包结构、校验和访问规则见 [素材说明](docs/assets.md)。正式用户只从公开 Beta Release 下载包含加密素材的 DMG。

## 开发

```bash
pnpm test:code
pnpm test
pnpm serve
pnpm serve:site
pnpm desktop
```

`pnpm serve` 打开 `http://localhost:4173`；`pnpm serve:site` 打开英文默认、支持中英文切换的官方页面 `http://localhost:4190`。桌面打包前先确认 `pnpm assets:verify` 通过。

## 打包

```bash
pnpm dist:dir
pnpm dist:mac
pnpm dist:win
pnpm dist:win:dir
```

## 文档

- [产品范围](docs/product.md)
- [架构](docs/architecture.md)
- [开发指南](docs/development.md)
- [素材管理](docs/assets.md)
- [Codex 插件](docs/codex-plugin.md)
- [发布流程](docs/release.md)
- [官网设计规格](docs/superpowers/specs/2026-08-01-itsees-official-website-design.md)
- [仓库审计与清理范围](docs/repository-audit.md)

## 权利

本仓库未授予开源许可。详见 [RIGHTS.md](RIGHTS.md)。第三方依赖见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
