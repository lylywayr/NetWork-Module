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

---

## 本仓库自托管版本改动（2026-11-14）

针对「打开视频卡顿」问题的优化，思路是把**最频繁、响应体最大**的接口从 WebView 引擎切到 JSC 引擎，减少跨进程数据传输。

### 一、脚本自托管

`request.bundle.js` / `response.bundle.js` 已复制到本目录，模块内所有 `script-path` 改为指向本仓库：

```
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/模块-BiliBiliAdsLite/response.bundle.js
```

不再依赖 Biliverse 的 Releases 下载地址。

### 二、引擎调整

| 脚本 | 原引擎 | 新引擎 | 原因 |
|---|---|---|---|
| `playurl.response.grpc` | webview | **jsc** | 视频播放地址接口，单次响应体最大，是卡顿主因 |
| `view.response.grpc` | webview | **jsc** | 视频详情页，每次点开视频必经 |
| `feed.index.request.json` | webview | **jsc** | 首页推荐，无 body，高频调用 |

其余 8 个脚本保持 `engine=webview`（低频、且响应体大，留在 WebView 可避免占满 NE 进程内存）。

### 三、为什么这样改

Surge 的 WebView 引擎**最多 3 个会话并行**，超出的排队。打开视频时 App 会同时发出 `playurl`、`view`、`dynamic` 等多个请求，全部争抢这 3 个名额，且大响应体需要跨进程传输，造成明显延迟。

JSC 引擎同进程执行、初始化快、大数据传输无需跨进程，更适合这三个高频接口。

### 四、兼容性核对

已检查两个 bundle 的 WebAPI 依赖：

- `crypto` / `TextDecoder` / `TextEncoder`：均有 `typeof` 特性检测，JSC 下安全降级
- `globalThis.fetch`：属于 `$httpClient` 兼容层，未命中时抛错前有特性检测，JSC 下走 `$task.fetch` 原生分支

因此改 `jsc` 不会导致脚本异常。

### 安装

```
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/模块-BiliBiliAdsLite/BiliBiliAdsLite.sgmodule
```
