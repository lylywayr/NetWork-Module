# 波点音乐 解锁

## 说明

只做解锁与下载，不含任何去广告逻辑：

- 会员状态调试
- 歌曲下载（珍藏下载，付费专辑可导出文件）
- 付费专辑解锁

去广告已拆分到 `模块-去广告合并`：广告接口（`advert/info`、`service/banner/positions`、`service/advert/config`、`advert/free/config`、`popup/start/info`、`xs.gdt.qq.com`、`us.l.qq.com`）由那边用 Map Local 拦截，腾讯音乐广告域名走 URL Rewrite，配置净化 `service/conf/all` 由那边的 `bodian-clean.js` 处理。

两个模块互不重叠：本模块的脚本 pattern 已剔除全部广告接口，同一 URL 不会被两个模块各处理一次。

## 文件

- `BodianMusic.sgmodule`

主脚本为上游 `WeiGiegie/666` 的 `bdyy.js`，未本地化，跟随上游更新。如果上游改版导致解锁失效，先看是否需要同步 pattern。

## 安装

- Surge：导入 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-BodianMusic/BodianMusic.sgmodule`
- 深链：`surge:///install-module?url=https%3A%2F%2Fraw.githubusercontent.com%2Flylywayr%2FNetWork-Module%2Fmain%2FSurge%2F%25E6%25A8%25A1%25E5%259D%2597-BodianMusic%2FBodianMusic.sgmodule`

## 回退

如果某个功能因为 pattern 收窄而失效，把对应 URL 加回脚本的 pattern 即可。原完整 pattern 见 git 历史（2026-11-24 之前的版本）。

## 来源

- 上游：https://github.com/WeiGiegie/666 （`bdyy.js`）
- 迁出仓库：`lylywayr/Surge` → `Module/Spec/BodianMusic/BodianMusic.sgmodule`

## 维护记录

- 2026-11-13：从 `Surge` 迁入并按 `AGENTS.md` 整理。
- 2026-11-24：拆分为纯解锁模块。移除 4 条广告 URL Rewrite、`bodian-clean.js`、广告接口 pattern；模块名由「波点音乐 高级功能」改为「波点音乐 解锁」。去广告部分并入 `模块-去广告合并`。
