# Sub-Store Sync

## 说明
Sub-Store 托管订阅的定时同步任务，提供 6 / 12 / 24 小时三档频率。

## 文件
- `6hours.sgmodule`
- `12hours.sgmodule`
- `24hours.sgmodule`

## 安装
- Surge：按需导入其中一个 `.sgmodule`，不要同时启用多个频率。

## 来源
- 上游：`Peng-YM/Sub-Store` → `cron-sync-artifacts.min.js`
- 原 `Sub-Store.sgmodule` 来自 LoonKissSurge 分发链，已按来源清理要求移除。

## 维护记录
- 2026-11-24：移除 LoonKissSurge 版 `Sub-Store.sgmodule`，保留 Peng-YM 的 cron 同步模块。

## 上游本地化
- 本模块引用的上游脚本已下载到本目录，`script-path` 指向本仓副本；清单与 sha256 见 `上游/SOURCE.md`。
