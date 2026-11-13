# WPS 签到（旧版封装）

## 说明
打开 WPS App 任意活动页（任务中心 / 福利中心「天天领福利」）即可抓 Cookie。每日签到 + 福利中心任务 + 小程序打卡，参数里可关闭抓取。

## 文件
- `WPSCheckin.sgmodule` — 模块入口
- `wps.cookie.js` — 依赖脚本（已本地化到本目录）
- `wps.js` — 依赖脚本（已本地化到本目录）

## 安装
- Surge：导入 [WPSCheckin.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-WPSCheckin/WPSCheckin.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-WPSCheckin/WPSCheckin.sgmodule
```

## 参数
```text
cookie:true,hour:10,minute:0,hot:true,trial:true,signin:true,fragment:true,lottery:true,clockin:true,merge:false,debug:false
```

cookie：是否自动抓取 wps_sid，打开 WPS App 的任务中心 / 福利中心「天天领福利」活动页即可触发（抓到一次后可填 false 关闭）；hour / minute：每日定时执行的时、分（默认 10:00）；hot：限量爆款；trial：会员试用；signin：每日签到；fragment：打卡领会员；lottery：天天抽奖；clockin：小程序打卡；merge：合并通知，不单独推送；debug：打印接口原始响应，排错用。布尔参数填 true / false。

## 来源
- 迁出仓库：`lylywayr/Surge` → `Module/Spec/WPSCheckin/WPSCheckin.sgmodule`
- 仍引用的上游地址（非本账号仓库，删旧仓不受影响）：
  - https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png

## 维护记录
- 2026-11-13：从 `Surge` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
