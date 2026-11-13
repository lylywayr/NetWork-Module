# B站广告精简

## 说明
只保留广告相关脚本：开屏/推荐/搜索/播放页/播放地址/番剧/直播/动态；去掉弹幕、评论商业链接、隐私上报共 5 个非广告脚本。脚本来自 Biliverse/ADBlock v0.7.5。

## 文件
- `BiliBiliAdsLite.sgmodule` — 模块入口

## 安装
- Surge：导入 [BiliBiliAdsLite.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-BiliBiliAdsLite/BiliBiliAdsLite.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-BiliBiliAdsLite/BiliBiliAdsLite.sgmodule
```

## 来源
- 迁出仓库：`lylywayr/Surge` → `Module/Spec/BiliBiliAdsLite/BiliBiliAdsLite.sgmodule`
- 仍引用的上游地址（非本账号仓库，删旧仓不受影响）：
  - https://biliverse.github.io/guide/ad-block
  - https://github.com/Biliverse/ADBlock/releases/download/v0.7.5/request.bundle.js
  - https://github.com/Biliverse/ADBlock/releases/download/v0.7.5/response.bundle.js

## 维护记录
- 2026-11-13：从 `Surge` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
