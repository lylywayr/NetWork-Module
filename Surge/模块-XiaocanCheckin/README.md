# 小蚕霸王餐签到

## 说明
打开小蚕霸王餐 App 触发 RPC 请求自动抓参数，每天 08:00 自动签到。脚本来自 Sliverkiss。

## 文件
- `XiaocanCheckin.sgmodule` — 模块入口
- `gate.js` — 依赖脚本（已本地化到本目录）

## 安装
- Surge：导入 [XiaocanCheckin.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-XiaocanCheckin/XiaocanCheckin.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-XiaocanCheckin/XiaocanCheckin.sgmodule
```

## 参数
```text
cookie:true
```

cookie：是否抓取签到参数。抓到一次后可设为 false，脚本不再抓取、也不再弹通知

## 来源
- 迁出仓库：`lylywayr/Surge` → `Module/Spec/XiaocanCheckin/XiaocanCheckin.sgmodule`
- 仍引用的上游地址（非本账号仓库，删旧仓不受影响）：
  - https://gist.githubusercontent.com/Sliverkiss/27c601d97a3f8960b212e5cac5b6c470/raw/xcbwc.js

## 维护记录
- 2026-11-13：从 `Surge` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
