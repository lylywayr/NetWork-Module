# WPS 签到

## 说明
按 2026-11-12 WPS 活动页实时配置复核并翻新：自动抓 wps_sid，每天 10 点做签到、限量爆款、会员试用、打卡领会员、天天抽奖、小程序打卡并领昨日奖励。活动号与任务开关可在模块设置里改，组件号自动发现，模块本身不含任何凭证。

## 文件
- `WPSSign.sgmodule` — 模块入口
- `wps-cookie.js` — 依赖脚本（已本地化到本目录）
- `wps-signin.js` — 依赖脚本（已本地化到本目录）
- `wps-status.js` — 依赖脚本（已本地化到本目录）

## 安装
- Surge：导入 [WPSSign.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-WPSSign/WPSSign.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-WPSSign/WPSSign.sgmodule
```

## 参数
```text
CronExp:0 10 * * *,Tasks:all,Capture:1,ActivityNumber:HD2025031721339450,PageNumber:YM2025060910400185,Position:ios_flzx_grzxsdjg3001,AutoDiscover:1
```

CronExp:每天几点跑（Cron，默认 10:00，限量爆款 10 点开抢；改成 0 10,12 * * * 可补跑，脚本自带幂等）

Tasks:要做的任务，all=全部；也可只写 hot,trial,signin,fragment,lottery,clockin 中的几项，逗号分隔

Capture:1=开启抓 Cookie：每次经过请求都重新抓取、写入本机并弹「抓取成功」通知；0=关闭，完全不抓不弹（已存凭证保留，定时签到照常跑）

ActivityNumber:福利中心活动号，WPS 换活动时在这里改，不用改脚本

PageNumber:活动页编号，一般与活动号一起换

Position:活动页渠道位，一般不用改

AutoDiscover:1=按业务字段自动对齐组件号，0=只用脚本内置编号

## 来源
- 迁出仓库：`lylywayr/surge-modules` → `WPSSign.sgmodule`
- 仍引用的上游地址（非本账号仓库，删旧仓不受影响）：
  - https://(personal-act\.wps\.cn/activity-rubik/activity/page_info|moapi\.wps\.cn/app/ios/v1/app

## 维护记录
- 2026-11-13：从 `surge-modules` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
