# 吾爱破解签到

## 说明
打开 52pojie.cn 登录后自动抓取 Cookie，每天定时自动签到。抓取可用参数关闭；签到脚本来自 Yuheng0101/X。

## 文件
- `Wuai_Checkin.sgmodule` — 模块入口
- `wuai_cookie.js` — 依赖脚本（已本地化到本目录）

## 安装
- Surge：导入 [Wuai_Checkin.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-Wuai_Checkin/Wuai_Checkin.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-Wuai_Checkin/Wuai_Checkin.sgmodule
```

## 参数
```text
cookie:true,hour:9,minute:0
```

cookie：是否抓取 Cookie（抓到一次后设为 false，就不再进行抓取和 MITM 解密处理）；hour / minute：每日签到时间（默认 09:00，24 小时制）

## 来源
- 迁出仓库：`lylywayr/Surge` → `Module/Spec/Wuai_Checkin/Wuai_Checkin.sgmodule`
- 仍引用的上游地址（非本账号仓库，删旧仓不受影响）：
  - https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/52pojie.js

## 维护记录
- 2026-11-13：从 `Surge` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
