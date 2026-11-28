---
name: surge-ios
version: 2.2.0
description: 通过 Surge HTTP API/MCP 或 Mac Controller 检查和控制 Surge（iOS/Mac），覆盖策略与节点、规则、DNS、模块、脚本、抓包与代理诊断。涉及 Surge 专有命令、配置或 MCP 工具时使用。
---

# Surge for Minis

## 入口

`surge-cli`（默认 `http://127.0.0.1:6171`，Surge 的 HTTP API/MCP；`-r 127.0.0.1:6170` 则走 Surge Mac 的 CLI socket；`-r http://host:port` 可连其他 HTTP/MCP 实例），脚本化读取用 `--raw`。密码只来自 `SURGE_CLI_PASSWORD` 或 `--password-stdin`，不进参数、文件、日志或回复。检查：`[ -n "$SURGE_CLI_PASSWORD" ] && echo set || echo missing`；缺失时给 [设置 SURGE_CLI_PASSWORD](minis://settings/environments?create_key=SURGE_CLI_PASSWORD&create_value=&create_note=Surge%20External%20Controller%20password)，不让用户在聊天里发密码。30 秒内 10 次密码错误会临时封禁来源：连接被拒先停手，用 `security ban list` 查看，不反复重试。

客户端是 `scripts/surge_cli.py`（软链为 `/usr/local/bin/surge-cli`，缺失时 `ln -sf` 重建）。它是命令映射客户端，不是官方 `surge-cli`：官方写法（`policy-avoid`、`module show`、`capture-session`、`profile section …`）已兼容；Mac Controller 后端的其余命令按行协议透传，HTTP/MCP 后端未映射的命令会明确报错。映射没有覆盖的参数用 `mcp schema <工具>` 查、`mcp call <工具> <args.json>` 调，不要改脚本硬编码。

**两种后端（按 `-r` 前缀自动选）**：`http://` → HTTP API 的 MCP 端点（`POST /v1/mcp`，JSON-RPC，`X-Key` 或 Bearer 鉴权，实现在 `scripts/surge_mcp.py`；**iOS 6.0.0+、Mac 6.11.0+**，需 `http-api-mcp = true`）；裸 `host:port` → Mac Controller 的 CLI 行协议（密码行 + 引号命令，需 `external-controller-access`）。MCP 是无状态 Streamable HTTP：每次 POST 返回**单个 JSON**，没有逐帧流，也不要按 JSON Lines 或 `hasMore` 判断结束。HTTP 后端覆盖：`status`、`summary`、`version`、`mode`、`global-policy`、`policy-group`、`policy detail`、`policy-avoid`（=`policy avoid`）、`rule match|explain`、`rule temp`、`dns lookup|trace`、`flush dns`、`geoip`、`http probe`、`test*`、`diagnostics`、`benchmark`、`profile current|diff|switch|section`、`dump *`、`module list|show|enable|disable`、`feature`、`capture-filter`、`capture-session list|dump|data`（=`capture …`）、`environment`、`set`、`set-log-level`、`log`、`log watch`、`logbook`、`script`、`script-log`、`kill`、`reload`、`restart-engine`、`restart-ponte-server`、`stop`、`switch-profile`、`external-resource`、`proxy-runtime-status`、`security ban`、`watch`、`mcp tools|schema|call`；`plugin`、`vmnet`、`device`、`lsp`、`managed-profile`、`unattended-upgrade`、`profile list|check` 没有 MCP 端点，会报错而不是假装成功。`watch` 在 HTTP 后端是有界窗口（`watch <event[,event...]|speed> [秒]`，1–60，默认 10），事件枚举以 `mcp schema watch_events` 为准。

当前实测 **Controller Protocol 45**（Surge 6.100.0 build 4034，iOS 27.0.1，2026-11-19 采集）共 **62 个 MCP 工具**；工具名、必填/可选参数见 [mcp-tools.md](references/mcp-tools.md)，官方 CLI 对照见 [cli-commands.md](references/cli-commands.md)。参数会随版本变化，以运行时 `surge-cli mcp tools` / `mcp schema <工具>` 为准，不要按旧表猜。`policy detail` 看单个策略的解析结果；`policy-avoid`（软避让）只是让自动组优先避开，不是排除，所有成员不可用时仍可能选中；`capture-session` 读磁盘上的抓包会话；`module show` 看模块原文与 header。

MCP **没有** `plugin`、`vmnet`、`device`、`reconnect-device`、`lsp`、`managed-profile`、`unattended-upgrade`、`profile list|check` 端点；官方 CLI 在 Mac 上支持其中一些，不代表 `/v1/mcp` 也有。命令缺失或异常时先 `surge-cli --raw version`、`mcp tools` 核对，再查命令参考，不凭协议号推断。`restart-engine` 与 `reload` 不同，见变更规则。

改 Profile 内容：用 `profile section list|get|set`（protocol ≥31），不直接编辑挂载的文件。它会写到这一节实际所在的文件（跟随 `#!include`），写入前校验整个 Profile，写入后自动 reload。流程：`profile section get <name>` 取得正文与 revision，编辑后 `profile section set <name> <file> <revision>`。MCP 的 `get_profile_section` 返回 `{"result":"Section: …\nFile: …\nRevision: …\nLines: …\n\n<body>"}`，正文在空行之后；本技能解析成 `content`、`revision`、`file`、`editable`、`lines`。不要把整个包装回写。**MCP 回写必须带 revision**（官方工作流要求；CLI 可省略，但建议带），对不上会被拒绝。文件带 BOM 时 `sed '^'` 之类的行首匹配会失效，改用 Python 读写。只读节（企业/托管配置、URL include、多个文件拼装、混有 `#!include` 的节）不能改。**校验是整份配置级的**：单独改 `[Proxy Group]` 里的组名、而 `[Rule]` 还指向旧名，会直接报"该规则使用了未知的策略：X"并拒绝写入。跨节改名要分三步过渡，每步都是合法配置：① 先加新名（旧名并存）→ ② 改引用方 → ③ 删旧名。`get` 的输出可能含代理密码，不要原样贴出来。抓包过滤用 `capture-filter`（protocol ≥36）；`capture-session list|dump|data`（或 `capture sessions|requests|body|session-body`）读磁盘上的抓包会话（protocol ≥41）。

模块：`surge-cli module list|show|enable|disable <#!name>`（`show` 是官方写法，`get` 同义），按 `#!name` 匹配（不是文件名），会自动安排 reload；返回的 `enabled` 即结果。`module list` 给类型（internal/local/installed）、`#!version`、修改时间与各节新增行数；`module show` 再加全部 `#!` 头和模块原文（参数值不回显），排查"这条规则从哪来的"用它。Surge 不会检查远程模块是否有更新，更新仍要在 App 里做。**MCP 没有卸载端点**：只有 list/get/enable/disable，`DELETE /v1/modules/...` 返回 405，iSH 也访问不到 Surge 容器目录，所以删除模块只能请用户在 App 内左滑，或用 `disable` 让它不生效。新模块先把 `.sgmodule` 写入已核实的 Surge `Module/` 目录（常见挂载 `/var/minis/mounts/surge`，不覆盖同名文件），`module list` 出现后再启用。

## 能力边界：先查官方手册

只要问题涉及「Surge 支持不支持某个规则类型 / 参数 / 语法 / 开关」，**先读官方手册再动手**。本地 skill 没写不等于 Surge 没有；试错只能用来确认文档写法在当前版本是否生效，不能代替查文档，更不能凭一次报错就下「不支持」的结论。

- 全量索引（纯文本，`.md` 可直接 curl）：<https://manual.nssurge.com/llms.txt>
- 规则类型总表：`rules/overview.md`｜网络类规则：`rules/protocol-and-network.md`（`SUBNET`、`PROTOCOL`、`CELLULAR-RADIO/CARRIER`、`HOSTNAME-TYPE`）
- 例：按 Wi-Fi 分流不是单独的「SSID 规则」，而是 `SUBNET`：`SUBNET,SSID:Xiaomi_619F,DIRECT`；与目的地址组合时放进逻辑规则 `AND,((SUBNET,SSID:Xiaomi_619F),(IP-CIDR,192.168.31.0/24)),DIRECT`，`SSID` 支持 `*`/`?` 通配，大小写敏感。
- 同一套 subnet 表达式还用于 `[SSID Setting]` 段和 Subnet 策略组（`features/subnet-settings.md`、`policy-groups/subnet.md`）。

## 改动同步到 GitHub

任何改动（Profile 规则/策略组、仓库清单、模块、脚本，以及本 skill 自身）完成后都要尝试同步到 `lylywayr/NetWork-Module`，让仓库始终是可回滚的唯一真相源。

- 凭据：环境变量 `GH_TOKEN`（GitHub PAT），不在聊天、文件或命令回显里出现。
- 常规路径：`cd /var/minis/workspace/nm && git pull --no-rebase --no-edit && git add -A && git commit -m "<feat|fix|chore>(<范围>): <说明>" && git push`。仓库曾配过 rebase，`pull` 用 `--no-rebase`，别用 `--rebase`。
- 推送被拒先合并再推（`git pull --no-rebase --no-edit`），解决冲突后再 `push`；连续失败就如实报告，不反复重试。
- 本 skill 源在 `/var/minis/skills/surge-ios/`，改完复制到仓库 `Surge/Skills/surge-ios/` 再提交，保持两边一致；仓库侧的改动也要回写到本地 skill。
- 涉及凭据的文件（Profile、订阅地址、节点密码）不进仓库。

## 先看状态

依赖 Surge 联网的任务先 `surge-cli --raw status`；意外 EOF 或超时后重查。`status`/`environment` 没有暂停字段，Controller 能响应也不代表引擎在处理流量。是否暂停看 `logbook` 中最新一条 `type=network-switching` 记录：subtitle 含 `Surge iOS is now suspended`（如 "The network is managed by Surge Gateway"）即为自动暂停，切到其他网络后的记录则表示已恢复：

```sh
surge-cli --raw logbook 50 | python3 -c "import json,sys;r=[x for x in json.load(sys.stdin)['records'] if x.get('type')=='network-switching'];x=r[0] if r else {};print('suspended' if 'suspended' in x.get('subtitle','') else 'active',x.get('content'),'|',x.get('subtitle'))"
```

暂停由网络环境自动触发（Surge Mac 网关接管当前 Wi-Fi 等），首页显示 WAITING。CLI 没有恢复命令；需要时请用户点首页右上角状态按钮 → **Bypass Suspension**（临时绕过，不必离开网络），Bypass 不写 logbook，上面命令仍会显示 suspended，所以之后以重试原操作为准。不擅自重启、换模式或换实例。

## 参考

| 任务 | 文档 |
|---|---|
| **MCP 工具全量清单（61 个，必填/可选参数 + schema 查询方式）** | [mcp-tools.md](references/mcp-tools.md) |
| 官方 CLI 与 MCP/本技能命令对照、平台边界、`mcp call` 用法 | [cli-commands.md](references/cli-commands.md) |
| 命令、响应字段、环境 key-path | [command-reference.md](references/command-reference.md)（官方，只读相关节） |
| Profile/模块/代理/策略组/DNS/MITM/脚本配置语法 | [manual-index.md](references/manual-index.md) → 官方手册正文 |
| 规则集选源与体积（DOMAIN-SET / RULE-SET、blackmatrix7 结构、停更清单） | [rulesets.md](references/rulesets.md) |
| **Surge 支持不支持某个规则/参数（能力边界）** | 官方手册索引 <https://manual.nssurge.com/llms.txt>，按 `rules/*.md`、`profile/*.md` 读正文 |
| 路由解释、临时规则、DNS、实时日志、抓包、性能、Tailscale/WireGuard、未配置节点测试 | [diagnostics.md](references/diagnostics.md) |
| 插件编写（官方，macOS 专用；iSH 里没有 `plugin` 端点，只作阅读） | [plugin-authoring.md](references/plugin-authoring.md) |

不照搬其他代理客户端的语法；不确定时查官方正文，不猜字段或命令。

## 变更规则

- 改动前确认目标存在，只做最小授权变更，改后重读相关状态。
- **不追加 reload**：运行时操作（`set`、`set-log-level`、`feature set`、模式/策略选择、临时规则、DNS flush）即时生效；模块启停、Profile 切换自己会安排加载。直接改配置文件（含 `#!include` 的 .dconf）后 Surge 会检测到变化并自动重载（iPhone 实测约 2 秒，日志里会出现 `iCloud profile content changed` → `Reload profile`），不要再手动 reload；`profile section set` 也会自己 reload。Mac 端靠 iCloud 同步，可能延迟几十秒，急用时可以在 Mac 本机写入。`reload` 不是清理手段，会恢复配置中的日志等级等运行时状态。
- `restart-engine` 关闭连接并清空缓存和临时规则，`stop` 关闭 Surge：都须用户明确要求。
- 临时 verbose：变更完成后再设，结束或失败时恢复**原**等级，期间不要 reload 或切模块。
- 临时规则：只删本次添加的；`rule temp flush` 会清掉用户已有的，不用于清理。
- `<nil>` 赋值要加引号：`surge-cli --raw set 'AutoPolicyGroupOverride.Streaming=<nil>'`。

## 隐私与外部影响

- `dump profile` 含节点、订阅和凭据，确有必要才读，不原样输出。
- `--check <path>` 会把文件上传到 Surge 官方在线校验服务（`POST https://services.nssurge.com/v1/config/validate`，文档见 <https://manual.nssurge.com/tools/profile-validation.html>）；不自动上传当前 Profile，含凭据时先用脱敏副本并告知用户。该服务的解析器版本**可能比本机新、也可能旧**：先用 `curl https://services.nssurge.com/v1/version`（返回如 `6012000`，即 core 6.120.0）对比本机 `surge-cli version` 的 Core 号，再判断报错是否可信；判本机能力仍以 `profile section set` 写入实测为准。服务只校验文本本身：不解析 `#!include`、不下载 rule-set / policy-path、模块文件（非完整 profile）一律判失败，单次上限 512 KB，超时 10 秒。
- `http probe`、节点/DNS/带宽测试会产生真实流量，按需执行。`benchmark encryption` 测的是本机加密性能，不是带宽。
- `watch`、诊断、带宽测试在 Mac Controller 后端是持续流，Ctrl-C 结束；MCP 后端是单次有界结果（`watch` 1–60 秒），不要等 `hasMore`。
- API key 等于 Surge 的完全控制权（含运行脚本、停 Surge），只在可信网络监听；未开 `http-api-tls` 时 key 明文传输。
- MCP 单个结果按官方文档上限 256 KiB，超出会被截断（大流量 `dump` 可能返回不完整 JSON，解析失败先怀疑截断）；用维度/period/filter 收窄，别把截断当完整结果。

## 交付

报告实际状态、做了什么、验证结果和未确认之处。规则推演不冒充联网成功。

## 维护

官方 skill 只随 Surge Mac 应用发布，没有单独下载；但 Mac 版本身是公开 zip（`https://dl.nssurge.com/mac/v6/Surge-latest.zip`），里面就有 `Surge.app/Contents/Resources/Skills/surge/`。所以不必有 Mac：

- `scripts/sync_upstream_zip.sh` —— 下载该 zip、解出官方技能、与本地 diff；加 `--apply` 才写入 `references/command-reference.md`（只把 §1.1 换成 Minis 说明，§1.2 的 MCP 传输说明也放在 §1.1 里，避免被覆盖）和 `references/plugin-authoring.md`，并更新 `references/UPSTREAM_VERSION`。已下载的 zip 会复用。
- `scripts/sync_upstream.sh <host> [--apply]` —— 有 Mac 时走 SSH 的旧路径，作用相同。
- 官方 `SKILL.md` 永不自动覆盖：它是给 Mac + 官方 `surge-cli` 二进制写的（`/Applications` 路径、`--remote`、`plugin`/`vmnet`/`device`、流式 `hasMore`），照抄会引用 iSH 里不存在的命令。读 `/tmp/surge-upstream-zip/Surge.app/Contents/Resources/Skills/surge/SKILL.md`，只把新增的工作流合并进本文件。

只更新运行时事实（不需要官方包）：
1. `surge-cli --raw version` 记录 Surge build 与 Controller Protocol。
2. `surge-cli mcp tools` 导出当前 schema，对比 `references/mcp-tools.md` 的工具数、名称、必填/可选参数。
3. 映射变化改 `scripts/surge_mcp.py` / `surge_cli.py`，先补失败测试再改，跑 `python3 scripts/test_mcp_backend.py`（离线，不连 Surge）。

客户端只做命令映射；MCP 新增的参数优先走 `mcp call`，确认是通用需求再加映射，避免把官方 CLI 的语义复制错。
