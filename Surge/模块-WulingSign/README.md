# 五菱汽车 · 自动签到（WulingSign）

## 说明

运行时自动抓取并持久化登录凭证（模块文件本身不含任何凭证），每天定时签到、查询任务并领取可领积分。接口依据 2026-11-11 / 11-12 两份 Surge iOS 抓包实测配置；2026-11-13 00:09 已实测可在未打开 App 的情况下独立签到，并经服务端 `date_his` 回查确认。

模块参数默认值：`CronExp=0 8-23/3 * * *`、`Host=operation.wuling.com`、`AutoPick=1`（可选 `0` 关闭自动领奖）。

## 文件

- `WulingSign.sgmodule` — 模块入口
- `wuling-capture.js` — 抓凭证（http-request，写 `$persistentStore`）
- `wuling-signin.js` — 定时签到、幂等判断、回查自证、任务领取（cron）
- `wuling-status.js` — 查状态 / 重置（generic）
- `extract-har.js` — 本地抓包瘦身与脱敏工具（Node 命令行，不参与 Surge 运行）
- `GUIDE.html` — 完整使用说明、抓包分析结论与已知限制

## 安装

- Surge：导入 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-WulingSign/WulingSign.sgmodule`
- 三个 JS 由模块通过本仓库 raw 地址自动加载，安装时无需手动拷贝文件到手机；远程脚本更新间隔为 1 小时。
- 首次使用需开启 Surge 的 MITM、生成 CA 证书并在 iOS「证书信任设置」中完全信任，然后打开一次五菱汽车 App 的「签到 / 任务中心」完成凭证抓取。

## 参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `CronExp` | `0 8-23/3 * * *` | 每天 8/11/14/17/20/23 点检查，配合当天幂等锁补跑 |
| `Host` | `operation.wuling.com` | 签到页接口域名 |
| `AutoPick` | `1` | 自动领取服务端判定可领的任务积分，`0` 关闭 |

## 来源

- 上游：无（自建模块）。接口依据本人 Surge iOS 抓包分析，页面 JS 来自 `operation.wuling.com/html/task2023/`。
- 相对上游的改动：自行实现凭证运行时抓取与持久化、服务端 `date_his` 幂等、签到后回查自证、每日任务领取；未使用任何硬编码凭证。

## 维护记录

- 2026-11-11：初版，按抓包配置签到 / 任务接口。
- 2026-11-12：修复幂等判断（只认 `date_his`，移除 `cur>=max` 误判）；增加签到后回查自证。
- 2026-11-13：实测通过；远程脚本更新间隔改为 1 小时；按 AGENTS.md 迁入 `NetWork-Module`。
