# 去广告三合一（菜鸟 · 知乎 · 高德）

## 说明

一个模块覆盖三个 App 的去广告：菜鸟裹裹、知乎、高德地图。无参数，装上即生效；改完需重启 App 或清缓存。

合并原则：同一接口有冲突时按「先拦截、再置空、最后改写」取舍，同 URL 多条 Map Local 只留一条，脚本按 App 加前缀避免同名覆盖。

- **菜鸟裹裹**：奶思 fmz200 的 Map Local 全套 + thNylHx 的两条 404 兜底（nbcps 展示位、netflow ads.index）+ 三条 jq 改写（搜索页推荐、首页 banner/活动/会员、网络流量广告）。奶思的 `adkeyword.get` / `ads.m?show` 与 thNylHx 的同名规则冲突，保留奶思的脚本版。
- **知乎**：奶思 fmz200 全套（Rule 10 + URL Rewrite 9 + Map Local 14 + Body Rewrite 1 + 脚本 12），覆盖开屏、悬浮图标、顶部横幅、推荐/热榜信息流与直播、回答底部卡片、评论区顶部、会员页弹窗、我的页项目列表、搜索热词、服务器推送配置，并把 `link.zhihu.com` 跳转还原成真实链接。
- **高德地图**：JupiterH 的 16 条 jq 注入（`updatable` 与 `poi/detail` 两条原本是 `jq-path`，已内联为完整表达式）+ 奶思的域名/接口拦截（optimus-ads、adiu、valueadded、启动 init、日志上报等）。JupiterH 的 `valueadded/alimama/splash_screen` 被奶思的宽泛 `valueadded` reject 覆盖，已剔除。

与已有模块的关系：本模块的高德部分与「高德地图（mulanshan）」的 Map Local / Script 在 `scene/recommend`、`nodefaas`、`main-page`、`splash_screen` 上重叠，两者同时开启时 Map Local 会先命中。要用本模块的高德部分，请先关闭 mulanshan 那个模块。

## 文件

- `去广告三合一.sgmodule`
- `cainiao.js`（奶思原版，处理菜鸟 ads 与会话列表）
- `zhihu.js`（奶思原版，处理知乎信息流与配置）
- `header.js`（奶思原版，对菜鸟 UA 的 `amdc/mobileDispatch` 返回 404，断掉 HTTPDNS 调度）

## 安装

- Surge：导入 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-%E5%8E%BB%E5%B9%BF%E5%91%8A%E4%B8%89%E5%90%88%E4%B8%80/%E5%8E%BB%E5%B9%BF%E5%91%8A%E4%B8%89%E5%90%88%E4%B8%80.sgmodule`
- 深链安装：`surge:///install-module?url=<上面 URL 的编码>`

## 参数

无。

## 来源

- 菜鸟：fmz200/wool_scripts `Surge/module/split/partC/CaiNiaoGuoGuo.sgmodule`（2026-11-11）
- 菜鸟：thNylHx/Tools `Surge/LoonLab/CaiNiao.sgmodule`（2026-11-02）
- 知乎：fmz200/wool_scripts `Surge/module/split/partZ/Zhihu.sgmodule`（2026-11-11）
- 高德：JupiterH/Surge `Module/gaode.sgmodule`（2026-11-11，含内联 jq）
- 高德：fmz200/wool_scripts `Surge/module/split/partG/AutoNavi.sgmodule`（2026-11-11）

本仓库相对上游的改动：

1. 三个 App 合进一个模块，MITM 合并为单行 `%APPEND%`。
2. 去掉上游重复条目（知乎 appcloud / IP 各出现两次，高德 optimus-ads / logs / u51 各重复）。
3. JupiterH 两条 `jq-path` 内联为完整 jq 表达式；其中一条 `try (…) catch` 的括号位置有语法错误，已修正为 `try ((… ) == "type") catch false`。
4. 依赖脚本从上游 raw 复制到本仓库，模块内路径全部指向本仓库。
5. 与奶思 `valueadded` reject 冲突的 JupiterH Map Local 已剔除。

## 维护记录

- 2026-11-24：新建。来源全部 2026-11-11 版本，jq 17 条全部通过语法校验，Surge profile 校验通过。
