# Surge MCP 工具清单（Controller Protocol 45 / Surge 6.100.0 build 4034）

官方运行时 `tools/list` 快照（iOS 27.0.1，采集于 2026-11-19，Surge iOS 6.0.1）：共 62 个工具。每个工具带 annotations（`readOnlyHint`/`destructiveHint`/`idempotentHint`），客户端可据此决定是否先征求确认。**参数以运行时 schema 为准**，本表只做索引：

```sh
surge-cli mcp tools                     # 当前实例的完整 tools/list JSON（含 inputSchema）
surge-cli mcp schema watch_events       # 单个工具的 schema
surge-cli --raw mcp call dns_lookup args.json
```

Surge 升级后先跑 `mcp tools` 对比，工具名、参数和 enum 都可能变化；不要按本表猜参数。MCP 结果上限约 256 KiB，超出会截断（大流量 dump 可能得到不完整 JSON），列表类工具用 filter/limit、dump 用更小的维度或 period 收窄。

## 状态与环境

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `get_status` | Show the current profile name and path, outbound mode, global policy, feature switches (MITM, rewrite, scripting, HTTP capture, packet capture, cellular mode), uptime,… | — | — |
| `get_network_summary` | Passive snapshot of the network: interfaces, router, IPv4/IPv6 availability, DNS servers and state, and current warnings. | — | — |
| `get_environment` | Return the raw runtime environment dictionary: ProxyGroupSelection (select-group choices), AutoPolicyGroupOverride, AvoidedPolicies, ProxyMode (0 direct, 1 global prox… | — | — |
| `run_diagnostics` | Run Surge's network self-check (interfaces, router, DNS, proxy connectivity) and return its report. | — | — |
| `run_benchmark` | rule-matching measures the average time to match a request against the active rules. | `benchmark` | `size_mib` |
| `restart_engine` | Restart the proxy engine. | — | — |
| `stop_surge` | Stop Surge. | — | — |
| `set_outbound_mode` | Change the outbound mode: rule (route by rules), direct (everything direct), or proxy (everything through the global policy). | `mode` | — |
| `set_global_policy` | Change the policy used in global proxy mode. | `policy` | — |
| `set_feature` | Turn a feature on or off. | `feature`, `enabled` | — |
| `set_environment` | Assign runtime environment key paths, as shown by get_environment. | `values` | — |
| `set_log_level` | Change the runtime log level until the next reload. | `level` | — |

## 策略

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `list_policies` | List every proxy policy and policy group of the active profile, with their line hashes. | — | — |
| `list_policy_groups` | List policy groups with their type, current selection, and options. | — | `group` |
| `get_policy_detail` | Show the parsed definition and parameters of one policy. | `policy` | — |
| `select_group_policy` | Choose the policy of a select group, or override the choice of an automatic group (url-test, fallback, load-balance, smart). | `group`, `policy` | — |
| `set_policy_avoidance` | Temporarily keep a policy out of the decisions of automatic groups (url-test, fallback, load-balance, smart), for example one that passes the latency test but has poor… | `action` | `policy` |
| `get_proxy_runtime_status` | Show the runtime internals of one proxy: connection state and, for Tailscale and WireGuard, handshakes, DERP, exit node, and the path to each peer. | `policy` | — |

## 规则

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `list_rules` | List the effective rules of the active profile in matching order, including rule sets and module rules. | — | — |
| `match_rule` | Evaluate the active rule set for a destination without creating a connection, and show the matched rule and final policy. | `target` | `source_port`, `protocol`, `source_address`, `is_local`, `explain`, `url`, `sni`, `http_host`, `client_mac`, `device_name`, `process_path`, `user_agent`, `listen_port`, `port` |
| `list_temporary_rules` | List the temporary rules, which take precedence over all profile rules until Surge stops. | — | — |
| `edit_temporary_rules` | Add, remove, or retarget temporary rules, or remove them all. | `action` | `policy`, `rule` |

## DNS

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `dns_lookup` | Resolve a domain through Surge's DNS client and show the addresses, the answering server, the interface, the path, and the timing. | `domain` | `trace`, `interface` |
| `geoip_lookup` | Look up an IP address in the GeoIP and IP-ASN databases Surge uses for GEOIP and IP-ASN rules. | `address` | — |
| `flush_dns_cache` | Clear Surge's DNS cache. | — | — |

## 请求与抓包

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `list_requests` | List active and recent requests, newest first, with their URL, policy, matched rule, status, and traffic. | — | `scope`, `filter`, `failed_only`, `id`, `detail`, `limit` |
| `get_captured_body` | Read the captured request or response body of a request recorded while HTTP capture was on (list_requests shows replica true). | `id` | `part` |
| `kill_connection` | Terminate one active connection by its request id. | `id` | — |
| `list_capture_sessions` | List the HTTP capture sessions saved to disk, newest first, including those rules with always-capture write. | — | `include_size` |
| `list_capture_session_requests` | List the requests saved in one capture session, in the order they were saved, with total and matched counts for paging. | `session` | `filter`, `offset`, `detail`, `limit` |
| `get_capture_session_body` | Read the request or response body of a request saved in a capture session. | `session`, `key` | `offset`, `part` |
| `get_capture_filters` | Show the filters that decide which requests are recorded: in-memory for the recent requests kept while HTTP capture is off, on-disk for an HTTP capture session. | — | — |
| `set_capture_filter` | Change one capture filter; omitted options stay as they are. | `scope` | `removeKeywords`, `keywords`, `disableKeywords`, `httpOnly`, `addKeywords`, `enableKeywords`, `hideCrashReporterRequests`, `type`, `hideAppleRequests`, `hideUDP` |

## Profile

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `get_profile` | Return the profile text. | — | `variant` |
| `switch_profile` | Switch to another profile by name and reload. | `name` | — |
| `reload_profile` | Reload the active profile from disk. | — | — |
| `list_profile_sections` | List the sections of the active profile in order, with the file that holds each (the profile can include other files through #!include), whether it can be edited, its… | — | — |
| `get_profile_section` | Return the text of one profile section as written in the file that holds it, without its [header], plus its revision. | `section` | — |
| `replace_profile_section` | Replace the whole content of one profile section, or create it, and reload the profile. | `section`, `content` | `revision` |

## 模块与资源

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `list_modules` | List the available modules and which are enabled. | — | — |
| `get_module` | Show one module: the details of list_modules plus its text as written. | `name` | — |
| `set_modules_enabled` | Enable or disable modules by name. | `names`, `enabled` | — |
| `list_external_resources` | List the external resources of the profile (rule sets, modules, scripts, GeoIP databases) and their state. | — | — |
| `update_external_resource` | Download one external resource again, by its key as listed by list_external_resources. | `key` | — |

## 脚本

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `list_scripts` | List the scripts of the active profile. | — | — |
| `run_cron_script` | Run a cron script of the profile now and return its output and result. | `name` | — |
| `evaluate_script` | Evaluate JavaScript in Surge's script engine with the Surge script API ($httpClient, $persistentStore, $notification, $done, and so on) and return the log output, the… | `code` | `argument`, `engine`, `type`, `timeout` |
| `get_script_log` | Read the log of one script execution, identified by the log name and session id from a logbook record. | `name`, `session` | — |

## 测试

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `test_policies` | Test proxy policies. | `policies` | `test` |
| `test_policy_group` | Retest the members of an automatic policy group; the group may select a different policy afterwards. | `group` | — |
| `test_all_policies` | Test the latency of every policy. | — | — |
| `test_policy_bandwidth` | Measure the download or upload throughput of a policy. | `policy` | `direction` |
| `test_network` | Run an active network test without a proxy. | `test` | — |
| `test_ponte` | Diagnose the Ponte connection to another device of the same account. | `device` | — |
| `http_probe` | Send a real HTTP HEAD request through Surge and show the status code, duration, selected policy, matched rule, and response headers. | `url` | `policy` |

## 日志与监控

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `get_logs` | Read recent log lines. | — | `lines`, `source` |
| `get_logbook` | Return recent logbook records: notable events such as profile reloads, network changes, policy failures, and script runs. | — | `limit` |
| `watch_events` | Subscribe to live events for a short window and return what arrived. | `events` | `seconds` |
| `dump_runtime_data` | Return one runtime dataset. | `type` | `argument` |

## 安全

| 工具 | 说明 | 必填 | 可选 |
|---|---|---|---|
| `list_security_bans` | List addresses banned after repeated failed authentication to the controller, HTTP API, or proxy services. | — | — |
| `clear_security_bans` | Lift every unauthorized-access ban. | — | — |

## 与 Minis CLI 的对应

- `surge-cli` 是命令映射客户端，不是官方 CLI。官方与 MCP 的一一对应关系见 [cli-commands.md](cli-commands.md)。
- 任何工具都可用 `mcp call` 直接调用；映射没有覆盖的参数用它，不要改脚本硬编码。
- 结果若为 `isError`，MCP 后端抛错；服务端的 `structuredContent` 优先于文本内容。

minis_url: minis://skills/surge-ios/references/mcp-tools.md
