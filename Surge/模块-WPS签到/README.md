# WPS 签到

## 说明

按 **WPS Office 26.11.0（build 26.11.0193140）** 砸壳包逆向复核并升级（2026-11-21）：自动抓 wps_sid，每天 10 点抢限量爆款，再做签到、**智点领取**、打卡领会员、天天抽奖、会员试用、**福利中心领券**、小程序打卡并领昨日奖励。活动号、页面号、任务开关都在模块设置里改，组件号自动发现，模块本身不含任何凭证。

## 26.11.0 逆向结论

- **经典活动页仍是 `page_info` + `component_action`**：二进制里已没有 `activity/page_info` 字样，但服务端接口照旧可用（实测 2026-11-21 返回 31 个组件、打卡/抽奖/试用/爆款业务字段齐全），福利中心活动号 `HD2025031721339450` / `YM2025060910400185` 仍在投放。
- **26.11.0 新增 custom_page 活动体系**：`GET /activity-rubik/custom_page/info`、`POST /activity-rubik/custom_page/action`，请求字段为 `activity_number / page_number / origin_name / platform_type / biz_id / component_action / component_ref_key / module_ref_key / action_param / component_data / native_enable / web_enable`（取自二进制字符串）。当前投放的是「每日领取智点」，活动号 `HD2026102710505525`、页面号 `YM2026102710519929`、模块 `zhidian_grant`、`privilege_grant` type 16、`reward_type=zhidian`。
- **签到接口仍是 `personal-bus.wps.cn/sign_in/v1/*`**（day_info / encrypt/key / sign_in），返回 1 天会员 + 积分，字段与旧版一致；小程序打卡 `activity/clock_in/v1/*` 仍存活（POST 无签名会回「签名验证失败」）。
- **积分商城 `point.wps.cn`** 已进 26.11.0 的服务路由表，但公网无解析/不响应，暂时没有可白拿的接口。
- **小组件的任务中心**用了 `/activity-rubik/user/task_center/token_finish`，任务号由账号配置下发（`confiAcctSDK`），没有稳定入口，暂不纳入。

因此新版任务：`hot,zhidian,signin,fragment,lottery,trial,coupon,clockin`（默认 all）。

## 文件

- `WPSSign.sgmodule` — 模块入口
- `wps-cookie.js` — 抓 wps_sid（含 26.11.0 的 custom_page/info 入口）
- `wps-learn.js` — 学习你手动领取智点时的真实请求体
- `wps-signin.js` — 定时任务
- `wps-status.js` — 体检

## 安装

- Surge：导入 [WPSSign.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-WPS%E7%AD%BE%E5%88%B0/WPSSign.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-WPS%E7%AD%BE%E5%88%B0/WPSSign.sgmodule
```

## 参数

```text
CronExp:0 10 * * *,Tasks:all,Capture:1,Learn:1,ActivityNumber:HD2025031721339450,PageNumber:YM2025060910400185,Position:ios_flzx_grzxsdjg3001,ZActivityNumber:HD2026102710505525,ZPageNumber:YM2026102710519929,AutoDiscover:1
```

CronExp：每天几点跑（默认 10:00，限量爆款 10 点开抢；可写 `0 10,12 * * *` 补跑，脚本幂等）

Tasks：`all` 或 `hot,zhidian,signin,fragment,lottery,trial,coupon,clockin` 中任意几项

Capture：1=每次命中都重抓 Cookie 并弹通知；0=只保留已存凭证

Learn：1=在 App 里手动点「领取智点」时把真实请求结构存下来；0=关

ActivityNumber / PageNumber / Position：福利中心活动参数，换期改这里

ZActivityNumber / ZPageNumber：智点活动参数，默认 `HD2026102710505525` / `YM2026102710519929`

AutoDiscover：1=按业务字段自动对齐组件号；0=只用内置编号

## 智点领取怎么落到真实结构

26.11.0 的 `custom_page/action` 字段只存在于二进制字符串里，服务端没有公开文档。2026-11-21 用真实登录态实测了 20 多种结构，错误依次是 `module not found`、`empty action`、`action_param is required`——`component_ref_key` 认的是**模块键**（`zhidian_grant`）而不是组件号 `ZJ2024121714368233`，但动作名那一层没猜中。因此脚本策略：

1. **优先用真实样本**：`Learn=1` 时在 App 里手动点一次「领取智点」，`wps-learn.js` 会把那次 `custom_page/action` 的完整 body 存进本机；定时任务只替换活动号/页面号/privilege_id 后原样复用，结构与客户端逐字节一致；
2. **没有样本时**只试「模块键当组件键」和旧 `component_action` 接口兜底，避免对活动接口连发无效请求；
3. 哪套成功就把结构记到 `wps_custom_action`；重复运行靠 `status/desc/received_count` 判重，不会重复领；
4. 没样本又没命中时，通知里写「⏳ 智点:需学习」，不会伪装成失败。

## 验证

- `node --check` 三个脚本通过；
- 本地 Node 复刻 Surge 环境跑了 3 个场景：无 Cookie、领取成功（命中 `ref+module` 并写入学习记录）、领取全失败（自动降级 legacy 接口）；
- 真实接口用匿名请求核验：`custom_page/info` 返回 `zhidian_grant` 可领、`page_info` 返回四类任务组件、`personal-bus/sign_in/v1/day_info` 与 `clock_in/v1/info` 正常返回。

## 来源

- 类型：二改
- 迁出仓库：`lylywayr/surge-modules` → `WPSSign.sgmodule`
- 任务逻辑上游：`MaYIHEI/paperclip`（`app/wps/`）

## 上游本地化
- 上游模块本体与其使用的脚本已存入本目录 `上游/`（`原版-` 前缀，字节未改），清单与 sha256 见 `上游/SOURCE.md`。
