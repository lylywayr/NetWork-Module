# iOS 可用版规则清单

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
| `Telegram.list` | Rabbit-Spec/Surge | 0 |
| `Game.list` | Rabbit-Spec/Surge | 0 |
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

## 维护

```bash
python3 tools/sync_ios_rules.py          # 同步并写入
python3 tools/sync_ios_rules.py --check  # 只报告差异
```

## 维护记录

- 2026-11-27：建立目录，15 份清单完成首次同步，合计剔除 32 条 macOS 专有规则。
