# 去广告四合一（菜鸟 · 知乎 · 高德 · 水印相机）

## 说明

一个模块覆盖四个 App 的去广告：菜鸟裹裹、知乎、高德地图、今日水印相机。无参数，装上即生效；改完需重启 App 或清缓存。

合并原则：同一接口有冲突时按「先拦截、再置空、最后改写」取舍，同 URL 多条 Map Local 只留一条，脚本按 App 加前缀避免同名覆盖。

- **菜鸟裹裹**：奶思 fmz200 的 Map Local 全套 + thNylHx 的两条 404 兜底 + 三条 jq 改写。奶思的 `adkeyword.get` / `ads.m?show` 与 thNylHx 的同名规则冲突，保留奶思的脚本版。
- **知乎**：奶思 fmz200 全套（Rule 10 + URL Rewrite 9 + Map Local 14 + Body Rewrite 1 + 脚本 12），覆盖开屏、悬浮图标、顶部横幅、推荐/热榜信息流与直播、回答底部卡片、评论区顶部、会员页弹窗、我的页项目列表、搜索热词、服务器推送配置，并把 `link.zhihu.com` 跳转还原成真实链接。
- **高德地图**：JupiterH 的 16 条 jq 注入（`updatable` 与 `poi/detail` 两条原本是 `jq-path`，已内联）+ 奶思的域名/接口拦截。JupiterH 的 `valueadded/alimama/splash_screen` 被奶思的宽泛 `valueadded` reject 覆盖，已剔除。
- **今日水印相机**：ZenmoFeiShi 原版 `xhey-ad-clean.snippet` 的完整 16 条规则（TopOn / anythink / 百度 mobads / 快手 open.e / 车来了 / 1rtb / statisticslinks / 腾讯 sdkquic / 百度 als）+ 双分支脚本：对 `sensorsdata` 的 AB 实验接口注入 `CloseAllAd=true`，对 `jt-sdk-ios` 的 `iOSConfig.txt` 关掉开屏、插屏、激励、应用商店广告开关。

与已有模块的关系：本模块的高德部分与「高德地图（mulanshan）」的 Map Local / Script 在 `scene/recommend`、`nodefaas`、`main-page`、`splash_screen` 上重叠，两者同时开启时 Map Local 会先命中。要用本模块，请先关闭 mulanshan 那个模块。

## 文件

- `去广告四合一.sgmodule`
- `cainiao.js`（奶思原版，处理菜鸟 ads 与会话列表）
- `zhihu.js`（奶思原版，处理知乎信息流与配置）
- `header.js`（奶思原版，对菜鸟 UA 的 `amdc/mobileDispatch` 返回 404，断掉 HTTPDNS 调度）
- `xhey-ad-clean.js`（ZenmoFeiShi 原版完整版，含 sensorsdata AB 实验与 jt-sdk iOSConfig 两个分支）

## 安装

- Surge：导入 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-%E5%8E%BB%E5%B9%BF%E5%91%8A%E5%9B%9B%E5%90%88%E4%B8%80/%E5%8E%BB%E5%B9%BF%E5%91%8A%E5%9B%9B%E5%90%88%E4%B8%80.sgmodule`
- 深链安装：`surge:///install-module?url=<上面 URL 的编码>`

从三合一升级：先装本模块，再在 Surge 模块页删除旧的「三合一去广告」，两个同时开时 URL Rewrite 会重复。

## 参数

无。

## 来源

- 菜鸟：fmz200/wool_scripts `Surge/module/split/partC/CaiNiaoGuoGuo.sgmodule`（2026-11-11）
- 菜鸟：thNylHx/Tools `Surge/LoonLab/CaiNiao.sgmodule`（2026-11-02）
- 知乎：fmz200/wool_scripts `Surge/module/split/partZ/Zhihu.sgmodule`（2026-11-11）
- 高德：JupiterH/Surge `Module/gaode.sgmodule`（2026-11-11）
- 高德：fmz200/wool_scripts `Surge/module/split/partG/AutoNavi.sgmodule`（2026-11-11）
- 水印相机：ZenmoFeiShi/Qx `xhey-ad-clean.snippet` + `xhey-ad-clean.js`（原版）

本仓库相对上游的改动：

1. 四个 App 合进一个模块，MITM 合并为单行 `%APPEND%`。
2. 去掉上游重复条目（知乎 appcloud / IP 各出现两次，高德 optimus-ads / logs / u51 各重复）。
3. JupiterH 两条 `jq-path` 内联为完整 jq 表达式；其中一条 `try (…) catch` 的括号位置有语法错误，已修正。
4. 水印相机从 QX 语法转为 Surge 语法，并补回旧版 `模块-TodayWatermarkCamera` 遗漏的 7 条规则（anythink / toponadss / mobads / 快手 / 车来了 / sensorsdata AB）与脚本的 AB 分支。
5. 依赖脚本全部本地化到本仓库。

## 维护记录

- 2026-11-24：新建四合一（在三合一基础上并入今日水印相机完整版）。17 条 jq 语法校验通过，Surge profile 校验 OK。
