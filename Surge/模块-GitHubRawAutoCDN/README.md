# GitHub Raw 反代

## 说明
GitHub Raw 可选反代；CDN=OFF 或不填时不反代

## 文件
- `GitRawAutoCDN.sgmodule` — 模块入口
- `GitRawAutoCDN.js` — 依赖脚本（已本地化到本目录）

## 安装
- Surge：导入 [GitRawAutoCDN.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-GitHubRawAutoCDN/GitRawAutoCDN.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-GitHubRawAutoCDN/GitRawAutoCDN.sgmodule
```

## 参数
```text
CDN:OFF
```

CDN 简写：
OFF = 不反代
JSD = cdn.jsdelivr.net
JSD-F = fastly.jsdelivr.net
JSD-G = gcore.jsdelivr.net
GHP = ghproxy.net
GHP2 = gh-proxy.com
GM = hub.gitmirror.com
LLKK = gh.llkk.cc

自定义反代：直接把 URL 填到 CDN，例如：
https://example.com/{url}

自定义 URL 支持：
{url}
{url_encoded}
{user}
{repo}
{branch}
{path}
{path_encoded}

示例：
CDN=OFF
CDN=JSD
CDN=GHP
CDN=https://example.com/{url}

## 来源
- 迁出仓库：`lylywayr/egern` → `GitRawAutoCDN.sgmodule`
- 仍引用的上游地址（非本账号仓库，删旧仓不受影响）：
  - https://example.com/{url

## 维护记录
- 2026-11-13：从 `egern` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
