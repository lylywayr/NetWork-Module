# 官方 CLI / MCP / Minis 映射

来源：官方 [Surge Mac CLI](https://manual.nssurge.com/tools/cli.html) 与 [HTTP API](https://manual.nssurge.com/tools/http-api.html)（含 MCP），2026-11 页面。**MCP 工具名和参数以运行时 `surge-cli mcp tools` 为准**；本表是索引，不是 schema。

## 平台边界

| 能力 | iOS | Mac | 说明 |
|---|---|---|---|
| HTTP API | 4.4.0+ | 4.0.0+ | `http-api = key@host:port`，`X-Key` 或 Bearer |
| MCP `/v1/mcp` | 6.0.0+ | 6.11.0+ | 默认关闭，`http-api-mcp = true`；无状态 Streamable HTTP，每次 POST 返回**单个 JSON** |
| 官方 `surge-cli` | 无 | 有 | Mac 的 CLI 可 `--remote` 控制 iOS/tvOS 5.21.0+ |
| 本技能 `surge-cli` | 可用 | 可用 | 不是官方 CLI；`http://host:port` 走 MCP，裸 `host:port` 走 Mac Controller |

- 旧说法「iOS 只有 HTTP、Mac 只有 CLI」已过时：Mac 6.11+ 也提供 MCP，本技能对两种实例都能用 `-r http://…`。
- MCP 是**无状态单响应**：不能按 CLI 的 JSON Lines / `hasMore` 判断结束；`watch` 在 MCP 上是 1–60 秒有界窗口。
- 官方 CLI 的输出是给人看的格式；自动化一律 `--raw`，或直接 `mcp call` 取 JSON。
- Controller 协议的行协议只在 Mac CLI 监听器上存在；iOS 端口 6171 是 HTTP，不要混用。

## 官方 CLI 与 MCP 对照

| 官方 CLI | MCP 工具 | 本技能命令 |
|---|---|---|
| `status` / `version` | `get_status` | 同名 |
| `summary` / `dump summary` | `get_network_summary` | `summary` |
| `mode` | `get_status` / `set_outbound_mode` | `mode [get\|set]` |
| `global-policy` | `get_status` / `set_global_policy` | 同名 |
| `policy-group list\|get\|set` | `list_policy_groups` / `select_group_policy` | `policy-group` |
| `policy-avoid list\|add\|remove\|clear` | `set_policy_avoidance` | `policy-avoid`（也接受 `policy avoid`） |
| `rule match` / `rule explain` | `match_rule`（`explain=true`） | `rule match\|explain` |
| `rule temp list\|add\|remove\|set-policy\|flush` | `list_temporary_rules` / `edit_temporary_rules` | 同名 |
| `dns lookup` / `dns trace` | `dns_lookup`（`trace`） | 同名 |
| `flush dns` | `flush_dns_cache` | 同名 |
| `geoip` | `geoip_lookup` | 同名 |
| `http probe` | `http_probe` | `http probe` |
| `test` / `test-network` | `test_network` | 同名 |
| `test-policy` / `test-policy-udp` / `test-policy-external-ip` / `test-policy-nat-type` | `test_policies`（`test` 选项） | 同名 |
| `test-policy-bandwidth` | `test_policy_bandwidth` | 同名 |
| `test-all-policies` / `test-group` / `test-ponte` | `test_all_policies` / `test_policy_group` / `test_ponte` | 同名 |
| `diagnostics` | `run_diagnostics` | 同名 |
| `benchmark` | `run_benchmark` | 同名 |
| `profile current` | `get_status` | 同名 |
| `profile diff` | `get_profile` 两次（original + effective） | `profile diff` |
| `profile switch` | `switch_profile` | `switch-profile` |
| `profile section list\|get\|set` | `list_profile_sections` / `get_profile_section` / `replace_profile_section` | `profile section` |
| `module show` | `get_module` | `module show`（也接受 `module get`） |
| `module list` / `enable` / `disable` | `list_modules` / `set_modules_enabled` | `module` |
| `feature` | `get_status` / `set_feature` | `feature` |
| `capture-filter list\|get\|set` | `get_capture_filters` / `set_capture_filter` | 同名 |
| `capture-session list\|dump\|data` | `list_capture_sessions` / `list_capture_session_requests` / `get_capture_session_body` | `capture-session`（也接受 `capture`） |
| `dump traffic-stat-breakdown` | `dump_runtime_data` | `dump traffic-stat-breakdown` |
| `dump traffic-stat-records` / `-hourly` / `dns-lookup-times` / `policy-usage` / `rule-usage` / `performance` | `dump_runtime_data` | `dump …` |
| `environment` / `set` / `set-log-level` | `get_environment` / `set_environment` / `set_log_level` | 同名 |
| `log` / `log watch` | `get_logs` / `watch_events`（`events=["log"]`） | `log [file\|memory]` / `log watch` |
| `logbook` | `get_logbook` | 同名 |
| `watch <event>` / `watch speed` | `watch_events` | `watch <event[,event...]\|speed> [1-60s]` |
| `script list` / `run` / `evaluate` | `list_scripts` / `run_cron_script` / `evaluate_script` | `script` |
| `script-log` | `get_script_log` | 同名 |
| `kill` / `reload` / `restart-engine` / `stop` | `kill_connection` / `reload_profile` / `restart_engine` / `stop_surge` | 同名 |
| `restart-ponte-server` | `restart_ponte_server` | 同名（Ponte 未启用时失败） |
| `external-resource` | `list_external_resources` / `update_external_resource` | 同名 |
| `proxy-runtime-status` | `get_proxy_runtime_status` | 同名 |
| `security ban` | `list_security_bans` / `clear_security_bans` | 同名 |
| `managed-profile update` / `unattended-upgrade` / `plugin` / `vmnet` / `device` / `reconnect-device` / `lsp` / `profile list\|check` | 无 MCP 端点 | 报错，不假装成功 |

## 本技能扩展

官方 MCP 有的参数，CLI 映射未必全部开放。需要精确控制时直接调用：

```sh
surge-cli mcp tools                                  # 全部工具 + inputSchema
surge-cli mcp schema evaluate_script                 # 单个工具
surge-cli --raw mcp call evaluate_script args.json   # 参数文件，- 从 stdin
```

约定：

- `mcp call` 的参数文件必须是 UTF-8 JSON 对象；`--raw` 输出单行 JSON。
- 映射未覆盖的参数不要改脚本硬编码；先用 `mcp call`，再把通用需求反馈到 `scripts/surge_mcp.py`。
- `set` 的 `<nil>` 与 `(null)` 都表示删除运行时覆盖；数字形值按整数发送，需要字符串时用引号并注意 JSON 类型。
- `profile section get` 返回 JSON：`content`、`revision`、`file`、`editable`、`lines`。`replace_profile_section` 强烈建议带 `revision`。

## 官方 CLI 的流式与退出

- 官方 CLI 的 `watch`、`log watch`、`diagnostics`、带宽测试是持续输出，Ctrl-C 结束；本技能在 Mac Controller 后端保留该行为。
- MCP 后端没有长连接：`watch` 是有界窗口，`diagnostics`、`benchmark` 返回一次结果；不要等 `hasMore`。
- 结果上限约 256 KiB；超出会截断（大流量 dump 可能是不完整 JSON）。列表类工具带 `filter`、`limit` 收窄，dump 用更小的维度或 period。

## 更新方法

1. `surge-cli --raw version` 记录版本与 Controller Protocol。
2. `surge-cli mcp tools > tools-list.json`，与 `references/mcp-tools.md` 比对工具数、名称和参数。
3. 官方 CLI 页面有变时，优先改本文件与 `command-reference.md`，再同步 `scripts/` 的映射。
4. 没有 Mac 时不要假装同步了 `/Applications/Surge.app/Contents/Resources/Skills/`；官方 skill 只能从装有 Surge 的 Mac 取。

minis_url: minis://skills/surge-ios/references/cli-commands.md
