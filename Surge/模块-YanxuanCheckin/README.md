# 网易严选签到

## 说明
打开严选 App 的签到活动页（act.you.163.com/act/pub/ssr/HysmFsmeKj88.html）即可抓登录态。每日自动签到，参数里可关闭抓取、改时间或通知。

## 文件
- `YanxuanCheckin.sgmodule` — 模块入口
- `yanxuan_daily_sign.js` — 依赖脚本（已本地化到本目录）

## 安装
- Surge：导入 [YanxuanCheckin.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-YanxuanCheckin/YanxuanCheckin.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-YanxuanCheckin/YanxuanCheckin.sgmodule
```

## 参数
```text
cookie:true,hour:9,minute:10,notify:true
```

cookie：是否自动抓取登录态，打开严选 App 的签到活动页 act.you.163.com/act/pub/ssr/HysmFsmeKj88.html 即可触发（抓到一次后可填 false 关闭）；hour / minute：每日定时执行的时、分（默认 9:10）；notify：是否推送通知，填 false 只写日志。布尔参数填 true / false。

## 来源
- 迁出仓库：`lylywayr/Surge` → `Module/Spec/YanxuanCheckin/YanxuanCheckin.sgmodule`
- 仍引用的上游地址（非本账号仓库，删旧仓不受影响）：
  - https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/1f/68/01/1f6801fa-504c-fbe0-c14e-8f46b8245de2/AppIcon-1x_U007emarketing-0-8-0-85-220-0.png/100x100bb.jpg

## 维护记录
- 2026-11-13：从 `Surge` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
