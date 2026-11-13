# PingMe 签到

## 说明
打开 PingMe 的余额页自动抓 Cookie，每天 08:30 与 20:30 各签到一次。脚本来自 fmz200/wool_scripts。

## 文件
- `PingMeCheckin.sgmodule` — 模块入口
- `PingMeSignin.js` — 依赖脚本（已本地化到本目录）
- `gate.js` — 依赖脚本（已本地化到本目录）

## 安装
- Surge：导入 [PingMeCheckin.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-PingMeCheckin/PingMeCheckin.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-PingMeCheckin/PingMeCheckin.sgmodule
```

## 参数
```text
cookie:true
```

cookie：是否抓取签到 Cookie。抓到一次后可设为 false，脚本不再抓取、也不再弹通知

## 来源
- 迁出仓库：`lylywayr/Surge` → `Module/Spec/PingMeCheckin/PingMeCheckin.sgmodule`
- 仍引用的上游地址（非本账号仓库，删旧仓不受影响）：
  - https://api\.pingmeapp\.net/app/queryBalanceAndBonus

## 维护记录
- 2026-11-13：从 `Surge` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
