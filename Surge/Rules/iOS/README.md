# iOS 可用版规则清单

## 架构（2026-11-28 起）

以**公开权威源优先**：先取 `v2fly/domain-list-community` 的 geosite 分类（社区维护、每日更新，
`include:` 会递归展开），再用 Rabbit-Spec、blackmatrix7 等聚合源补 geosite 缺失的 IP 段与冷门域名，
最后在本仓库内做完全去重、后缀收敛，并剔除 macOS 专有的 `PROCESS-NAME`。

中国 IP 段由 `v2fly/geoip` 与 `misakaio/chnroutes2` 合并去重生成 `ChinaCIDR.list`。

构建脚本 `tools/build_ios_rules.py`，GitHub Actions 每日自动运行。两个护栏：
上游返回 Forbidden/空内容时保留旧文件；新结果不足旧文件一半时放弃覆盖。
## 说明

上游规则清单里混有 macOS 专有的规则类型（`PROCESS-NAME`，按进程名匹配）。Surge iOS 看不到进程，
这类规则在 iPhone 上永远不会命中。本目录是它们的镜像，只做一件事：剔除 macOS 专有规则，其余条目与
上游逐行一致，引用后每一条都会在 iOS 上真实生效。

清单由 `tools/sync_ios_rules.py` 生成，GitHub Actions 每天自动同步一次，**不要手改**。

## 清单

| 文件 | 上游来源 | 剔除条数 |
| --- | --- | --- |
| `AIGC.list` | Rabbit-Spec/Surge | 0 |
| `Apple.list` | Rabbit-Spec/Surge | 9 |
| `Telegram.list` | blackmatrix7/ios_rule_script | 5 |
| `Game.list` | Rabbit-Spec/Surge | 0 |
| `GameCN.list` | 由 `Game.list` 按落地归属拆分 | 0 |
| `GameIntl.list` | 由 `Game.list` 按落地归属拆分 | 0 |
| `YouTube.list` | Rabbit-Spec/Surge | 0 |
| `Netflix.list` | Rabbit-Spec/Surge | 1 |
| `BiliBili.list` | Rabbit-Spec/Surge | 2 |
| `ChinaMedia.list` | Rabbit-Spec/Surge | 2 |
| `GlobalMedia.list` | Rabbit-Spec/Surge | 3 |
| `Google.list` | Rabbit-Spec/Surge | 4 |
| `Proxy.list` | Rabbit-Spec/Surge | 8 |
| `GitHub.list` | blackmatrix7/ios_rule_script | 0 |
| `Microsoft.list` | blackmatrix7/ios_rule_script | 2 |
| `TikTok.list` | blackmatrix7/ios_rule_script | 1 |
| `AWAvenueAds.list` | TG-Twilight/AWAvenue-Ads-Rule | 0 |

剔除数量随上游变动，实际值以每个文件头部 `# TOTAL:` 为准。

## 引用

```ini
RULE-SET,https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/Rules/iOS/Google.list,谷歌服务,no-resolve
RULE-SET,https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/Rules/iOS/AWAvenueAds.list,REJECT,pre-matching,extended-matching,no-resolve
```

`China.list`（DOMAIN-SET 格式）与 `ChinaCIDR.list` 上游本身不含 Mac 专有规则，继续直连上游即可。

首次切换后执行一次 `external-resource update all`，或重启 Surge 引擎，确保拉取新地址。

## 游戏清单拆分

`GameCN.list` / `GameIntl.list` 由 `tools/split_game_rules.py` 生成：逐条走 DoH（doh.pub / alidns）解析，
任一 A 记录落在 `ChinaCIDR` 里或域名本身是 `.cn` 的归入 CN（直连），其余归入 Intl（游戏平台）。
上游更新后手动重跑一次，两份文件一起提交。

## 维护

```bash
python3 tools/sync_ios_rules.py          # 同步并写入
python3 tools/sync_ios_rules.py --check  # 只报告差异
```

## 游戏清单拆分

`GameCN.list` / `GameIntl.list` 由 `tools/split_game_rules.py` 生成：逐条走 DoH（doh.pub / alidns）解析，
任一 A 记录落在 `ChinaCIDR` 里或域名本身是 `.cn` 的归入 CN（直连），其余归入 Intl（游戏平台）。
上游更新后手动重跑一次，两份文件一起提交。

## 维护记录

- 2026-11-27：建立目录，15 份清单完成首次同步，合计剔除 32 条 macOS 专有规则。
- 2026-11-27：`Telegram.list` 换源到 blackmatrix7 —— 原 Rabbit 版只有 14 条 IP 段、零域名，iOS 上 `telegram.org` 这类域名走不到电报信息组；换源后 25 条域名 + 10 条 IP 段。
