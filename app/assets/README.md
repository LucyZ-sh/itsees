# Runtime assets

Large runtime assets are intentionally absent from Git. From the repository root:

```bash
pnpm assets:install -- --source ../release-assets
pnpm assets:verify
```

素材包发布地址：<https://github.com/LucyZ-sh/itsees/releases/tag/assets-v1>

The tracked brand assets in `brand/` are sufficient to identify the repository but not to run the full application.
