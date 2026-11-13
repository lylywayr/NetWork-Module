# 环回 VPN

## 说明
用 Surge 替代 LocalDevVPN：把发往 10.7.0.1 的包在 IP 层原路弹回本机，供 Swipt / SideStore 连接本机开发者服务。启用后不要再开 LocalDevVPN（iOS 同时只允许一个 VPN）。修改后需完全关闭 VPN 再打开。

## 文件
- `SwiptLoopback.sgmodule` — 模块入口

## 安装
- Surge：导入 [SwiptLoopback.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-SwiptLoopback/SwiptLoopback.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-SwiptLoopback/SwiptLoopback.sgmodule
```

## 来源
- 迁出仓库：`lylywayr/surge-modules` → `SwiptLoopback.sgmodule`

## 维护记录
- 2026-11-13：从 `surge-modules` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
