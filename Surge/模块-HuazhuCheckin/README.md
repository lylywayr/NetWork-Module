# 华住会签到

## 说明
打开华住会 App 的签到页自动抓 Cookie，每天 00:05 自动签到。脚本来自 evilbutcher/QuantumultX。

## 文件
- `HuazhuCheckin.sgmodule` — 模块入口
- `gate.js` — 依赖脚本（已本地化到本目录）

## 安装
- Surge：导入 [HuazhuCheckin.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-HuazhuCheckin/HuazhuCheckin.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-HuazhuCheckin/HuazhuCheckin.sgmodule
```

## 参数
```text
cookie:true
```

cookie：是否抓取签到 Cookie。抓到一次后可设为 false，脚本不再抓取、也不再弹通知

## 来源
- 迁出仓库：`lylywayr/Surge` → `Module/Spec/HuazhuCheckin/HuazhuCheckin.sgmodule`
- 仍引用的上游地址（非本账号仓库，删旧仓不受影响）：
  - https://raw.githubusercontent.com/evilbutcher/QuantumultX/main/check_in/hzh/hzh.js

## 维护记录
- 2026-11-13：从 `Surge` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
