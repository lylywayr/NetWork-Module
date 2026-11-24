# 去广告合并

## 说明

一个模块覆盖多个 App 的去广告，无参数，装上即生效；改完需重启 App 或清缓存。

**目录与文件名固定**：以后新增或移除 App 只改 `.sgmodule` 内容，路径不动，已安装的设备直接覆盖升级，不需要换链接。

当前覆盖：菜鸟裹裹、知乎、高德地图、今日水印相机。

合并原则：同一接口有冲突时按「先拦截、再置空、最后改写」取舍，同 URL 多条 Map Local 只留一条，脚本按 App 加前缀避免同名覆盖。

- **菜鸟裹裹**：奶思 fmz200 的 Map Local 全套 + thNylHx 的两条 404 兜底 + 三条 jq 改写（搜索页推荐、首页 banner/活动/会员、网络流量广告）。奶思的 `adkeyword.get` / `ads.m?show` 与 thNylHx 的同名规则冲突，保留奶思的脚本版。
- **知乎**：奶思 fmz200 全套（Rule 10 + URL Rewrite 9 + Map Local 14 + Body Rewrite 1 + 脚本 12），覆盖开屏、悬浮图标、顶部横幅、推荐/热榜信息流与直播、回答底部卡片、评论区顶部、会员页弹窗、我的页项目列表、搜索热词、服务器推送配置，并把 `link.zhihu.com` 跳转还原成真实链接。
- **高德地图**：JupiterH 的 16 条 jq 注入（`updatable` 与 `poi/detail` 两条原本是 `jq-path`，已内联）+ 奶思的域名/接口拦截。JupiterH 的 `valueadded/alimama/splash_screen` 被奶思的宽泛 `valueadded` reject 覆盖，已剔除。
- **今日水印相机**：ZenmoFeiShi 原版 `xhey-ad-clean.snippet` 的完整 16 条规则（TopOn / anythink / 百度 mobads / 快手 open.e / 车来了 / 1rtb / statisticslinks / 腾讯 sdkquic / 百度 als）+ 双分支脚本：对 `sensorsdata` 的 AB 实验接口注入 `CloseAllAd=true`，对 `jt-sdk-ios` 的 `iOSConfig.txt` 关掉开屏、插屏、激励、应用商店广告开关。
- **波点音乐**（只去广告，解锁在 `模块-波点音乐解锁`）：腾讯音乐广告域名 4 条 URL Rewrite（`mc.tencentmusic.com`、`ad.tencentmusic.com`、`tmeadcomm.y.qq.com`、`ossgw.alicdn.com/creatives-assets`）+ 7 条 Map Local 返回 `{}`（`play/advert/info`、`service/banner/positions`、`service/advert/config`、`advert/free/config`、`popup/start/info`、`xs.gdt.qq.com/style_factory/template_list`、`us.l.qq.com/exapp`）+ `bodian-clean.js` 净化 `service/conf/all`（删 adStartAppDialog / adGuideTest / playTips / adExitChange / adGuidePopCount / adDownListOpen，关 P2P）。

与已有模块的关系：本模块的高德部分与「高德地图（mulanshan）」的 Map Local / Script 在 `scene/recommend`、`nodefaas`、`main-page`、`splash_screen` 上重叠，两者同时开启时 Map Local 会先命中。要用本模块，请先关闭 mulanshan 那个模块。

## 文件

- `去广告合并.sgmodule`
- `cainiao.js`（奶思原版，处理菜鸟 ads 与会话列表）
- `zhihu.js`（奶思原版，处理知乎信息流与配置）
- `header.js`（奶思原版，对菜鸟 UA 的 `amdc/mobileDispatch` 返回 404，断掉 HTTPDNS 调度）
- `xhey-ad-clean.js`（ZenmoFeiShi 原版完整版，含 sensorsdata AB 实验与 jt-sdk iOSConfig 两个分支）
- `bodian-clean.js`（波点音乐配置净化，`service/conf/all` 删广告开关）

## 安装

- Surge：导入 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-%E5%8E%BB%E5%B9%BF%E5%91%8A%E5%90%88%E5%B9%B6/%E5%8E%BB%E5%B9%BF%E5%91%8A%E5%90%88%E5%B9%B6.sgmodule`
- 深链：`surge:///install-module?url=https%3A%2F%2Fraw.githubusercontent.com%2Flylywayr%2FNetWork-Module%2Fmain%2FSurge%2F%25E6%25A8%25A1%25E5%259D%2597-%25E5%258E%25BB%25E5%25B9%25BF%25E5%2591%258A%25E5%2590%2588%25E5%25B9%25B6%2F%25E5%258E%25BB%25E5%25B9%25BF%25E5%2591%258A%25E5%2590%2588%25E5%25B9%25B6.sgmodule`

历史模块已废弃，装本模块后请删除：`三合一去广告（菜鸟 · 知乎 · 高德）`、`今日水印相机去广告`、`去广告合集`。

## 参数

无。

## 来源

- 类型：二改
- 菜鸟：fmz200/wool_scripts `Surge/module/split/partC/CaiNiaoGuoGuo.sgmodule`（2026-11-11）
- 菜鸟：thNylHx/Tools `Surge/LoonLab/CaiNiao.sgmodule`（2026-11-02）
- 知乎：fmz200/wool_scripts `Surge/module/split/partZ/Zhihu.sgmodule`（2026-11-11）
- 高德：JupiterH/Surge `Module/gaode.sgmodule`（2026-11-11）
- 高德：fmz200/wool_scripts `Surge/module/split/partG/AutoNavi.sgmodule`（2026-11-11）
- 水印相机：ZenmoFeiShi/Qx `xhey-ad-clean.snippet` + `xhey-ad-clean.js`（原版）
- 波点音乐：WeiGiegie/666 `bdyy.js` 配套的广告规则 + 本仓库 `模块-波点音乐解锁` 拆出的 `bodian-clean.js`

本仓库相对上游的改动：

1. 多个 App 合进一个模块，MITM 合并为单行 `%APPEND%`。
2. 去掉上游重复条目（知乎 appcloud / IP 各出现两次，高德 optimus-ads / logs / u51 各重复）。
3. JupiterH 两条 `jq-path` 内联为完整 jq 表达式；其中一条 `try (…) catch` 的括号位置有语法错误，已修正。
4. 水印相机从 QX 语法转为 Surge 语法，并补回旧版 `模块-今日水印相机去广告` 遗漏的 7 条规则与脚本的 AB 分支。
5. 依赖脚本全部本地化到本仓库。

## 维护记录

- 2026-11-24：定名 `模块-去广告合并` / `去广告合并.sgmodule`，路径从此固定；内容为菜鸟 + 知乎 + 高德 + 今日水印相机。
- 2026-11-24：并入波点音乐去广告部分，解锁留在 `模块-波点音乐解锁`。

## 上游本地化
- 上游模块本体与其使用的脚本已存入本目录 `上游/`（`原版-` 前缀，字节未改），清单与 sha256 见 `上游/SOURCE.md`。
