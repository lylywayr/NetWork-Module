# Surge CLI / Controller Command Reference (for AI Agents)

This document is the Surge CLI operational reference for AI agents. It covers
the product-oriented commands intended for routine use and the advanced
controller commands that are not all shown by `-h`.

## 1. CLI Usage

### 1.1 Basic format (Minis)

> Synced from the Surge-bundled skill; only this subsection is Minis-specific.
> `/usr/local/bin/surge-cli` is a Python client talking to the Surge iOS External Controller.

```bash
surge-cli [--remote host:port] [--password-stdin] [--raw] <command> [args...]
```

- Default `http://127.0.0.1:6171` (HTTP API / MCP). `-r 127.0.0.1:6170` uses the Mac Controller line protocol; `--remote` works for other instances too.
- MCP: iOS 6.0.0+ / Mac 6.11.0+, requires `http-api-mcp = true`; stateless Streamable HTTP, every POST returns one JSON body.
- On the HTTP/MCP backend, `tools/call` returns `content` text plus optional `structuredContent`; `isError` marks a failed tool call and a result is capped at about 256 KiB (a large dump may be truncated into invalid JSON). There is no `hasMore` stream — `watch` is a bounded 1–60 s window. Use `mcp schema <tool>` for the authoritative parameters.
- Password from `--password-stdin` or `SURGE_CLI_PASSWORD`; never in argv.
- Prefer `--raw` for exact JSON; human formatting exists only for common commands. The HTTP/MCP backend has a fixed route table, so unsupported commands fail explicitly instead of being passed through.
- `mcp tools`, `mcp schema <tool>` and `mcp call <tool> <args.json|->` expose the exact official tool schema and any parameter the CLI mapping lacks.
- `--check <path>` uploads that file to Surge's online validator (`services.nssurge.com`); there is no local parser in iSH. Redact secrets first; never upload the active profile implicitly.
- `lsp`, interactive mode, `plugin validate|pack`, `vmnet`, `device` are macOS-only and not available here.

### 1.2 Response envelope

Responses are JSON and usually include:

- `result`: success text
- `error`: error text
- payload fields (for example `requests`, `environment`)
- `hasMore` for streaming commands (`true` means more chunks follow)

## 2. Full Command Catalog

The table below is the full command catalog handled by the controller (not just
the subset shown in `-h`). High-priority subcommands may also appear as their
own rows.

| Command | Args | Description | Notes |
|---|---|---|---|
| `status` | none | summarize profile name and full path, mode, features, uptime, and version | see 3.14 |
| `dump summary` | none | show a passive snapshot of network configuration, DNS, and warnings | recommended first network diagnostic, see 3.15 |
| `version` | none | show app, Core, protocol, OS, and device versions | see 3.14 |
| `mode` | `[get \| set <rule\|direct\|proxy>]` | get or change outbound mode | direct mode name is `direct` |
| `global-policy` | `[get \| set <policy>]` | get or change the global proxy policy | |
| `policy-group` | `list \| get <group> \| set <group> <policy\|auto>` | inspect and select policy groups | `auto` clears an automatic-group override; automatic groups list their `avoided` options (protocol ≥40) |
| `policy-avoid` | `list \| add <policy> \| remove <policy> \| clear` | temporarily keep a policy out of automatic group decisions | protocol ≥40; url-test/fallback/load-balance/smart use an avoided policy only when no other member is usable; select/subnet groups, overrides and direct references ignore it; cleared when Surge restarts |
| `profile` | `list \| current \| diff \| check <name> \| switch <name> \| section <list \| get <name> \| set <name> <file\|-> [revision]>` | inspect, compare, validate, and switch profiles; read and replace one profile section | `list`/`check` are macOS only; `section` needs protocol ≥31, see 3.7.1 |
| `module` | `list \| show <name> \| enable <name...> \| disable <name...>` | inspect module details and text; change module state | changes schedule a profile reload |
| `feature` | `list \| get <name> \| set <name> <on\|off>` | inspect and change runtime features | see 3.14 |
| `capture-filter` | `list \| get <in-memory\|on-disk> \| set <in-memory\|on-disk> <option>=<value>...` | inspect and change which requests are recorded | protocol ≥36, see 3.14.1 |
| `capture-session` | `list [include-size] \| dump <session> [offset=N] [limit=N] [filter=TEXT] \| data <session> <key> <request\|response> [offset=N] [length=N]` | read HTTP capture sessions saved to disk and their bodies | protocol ≥37; full capture workflow in 3.14.2 |
| `device` | `list \| show <identifier\|mac>` | inspect gateway-mode devices | macOS only |
| `log` | `[file\|memory] [line-count]` or `watch` | show retained logs or continuously follow new logs | defaults to `file 100`; maximum 10000, see 3.16 |
| `watch` | `[event ...]` | subscribe to events; without args unsubscribes | `watch request` is common |
| `dump` | `<type> [extra]` | dump runtime state data | see 3.2 |
| `test` | `<type>` | environment diagnostics | see 3.3 |
| `environment` | none | return current environment dictionary | |
| `set` | `<key>=<value> ...` | update environment | see 4 |
| `set-log-level` | `<level>` | change runtime log level | does not write profile, see 3.16 |
| `stop` | none | stop Surge | |
| `kill` | `<connection-id>` | terminate a connection | |
| `test-group` | `<group-name>` | retest a policy group immediately | |
| `test-all-policies` | none | retest all policies | |
| `test-policy` | `<policy...>` | test one or more policies | |
| `test-policy-udp` | `<policy...>` | UDP policy test | Requires Internet egress: a peer-to-peer Tailscale/WireGuard policy (`Test Capability: rtt-only`) returns a not-applicable error (also with a `test-url`, which only changes the TCP test; check `Internet Egress: No`); use `test-policy` for its RTT probe |
| `test-policy-external-ip` | `<policy>` | probe external IP via a policy | STUN-based |
| `test-policy-nat-type` | `<policy>` | probe NAT type via a policy | STUN-based |
| `test-policy-bandwidth` | `<download\|upload> <policy>` | run bandwidth diagnostics via a policy | streaming output |
| `benchmark` | `encryption [data-size-mib]` \| `rule-matching` | benchmark local encryption throughput or rule matching speed | encryption is streaming, see 3.3.1; rule-matching see 3.12 |
| `rule` | `<match\|explain> <host\|url> [port] [key=value ...]` | evaluate the rule set without creating a connection | see 3.9 |
| `dns` | `<lookup\|trace> <domain> [interface=<bsd-name>]` | resolve via Surge's DNS with optional resolver trace | see 3.10 |
| `geoip` | `<ip-address>` | look up the local GeoIP/ASN databases | see 3.10 |
| `http` | `probe <url> [policy]` | send an HTTP HEAD request and report status, timing, route, and headers | rule-set routing when policy omitted |
| `security` | `ban <list\|clear>` | inspect or clear unauthorized-access bans | |
| `vmnet` | `<status\|arp\|ndp\|ra>` | inspect the VMNET virtual interface (gateway mode) | macOS only, see 3.13 |
| `flush` | `<type>` | flush data | currently only `dns` |
| `reload` | none | reload main profile, applying only the changed sections | falls back to a full engine restart automatically when a change requires one |
| `restart-engine` | none | completely restart the engine and reload the profile from scratch | closes all connections, clears all caches and temporary rules |
| `restart-ponte-server` | none | restart this device's Ponte server | its channels are set up again and other devices' connections to it drop; errors when Ponte isn't enabled; protocol ≥42 |
| `show-policy` | `<policy-name>` | show policy details | |
| `retrieve-data` | `<record-id> <request\|response> [replica-dir]` | fetch captured request/response body | data-channel command |
| `test-network` | none | network delay test | returns `time` |
| `script` | `list \| run <cron-name> \| evaluate <base64-js> [mockType] [timeout] [engine] [argument]` | inspect and run scripts | CLI has an evaluate wrapper, see 3.4 |
| `diagnostics` | none | start diagnostics event stream | pair with `stop-diagnostics` |
| `stop-diagnostics` | none | stop diagnostics event stream | |
| `get-resource` | `device-icon <id...>` | fetch device icons (Base64) | |
| `set-dhcp-device` | `<mac> <type> [value]` | set DHCP device parameters | macOS only, see 3.5 |
| `remove-device-record` | `<identifier...>` | remove device records | macOS only |
| `switch-profile` | `<profile-name>` | switch to another profile | |
| `managed-profile` | `update` | update and reload the active managed profile | macOS only |
| `update-profile` | `<base64-rule-section>` | update Rule section | macOS only; superseded by `profile section set Rule` |
| `proxy-runtime-status` | `<policy-name \| line-hash>` | inspect one proxy's live runtime and recent errors | essential for Tailscale/WireGuard diagnosis, see 3.1 |
| `add-temp-rule` | `<rule>` | add temporary rule | |
| `del-temp-rule` | `<rule>` | delete temporary rule | |
| `update-temp-rule` | `<rule> <new-policy>` | change policy of temporary rule | |
| `flush-temp-rule` | none | clear all temporary rules | |
| `unattended-upgrade` | none | unattended upgrade | macOS only |
| `provider-message` | `<base64-data>` | send message to Packet Tunnel Provider | unsupported on macOS |
| `external-resource` | `list \| update <key\|all>` | external resource listing and update | |
| `plugin` | `list \| info \| parameters \| install \| load-unpacked \| configure \| enable \| disable \| select \| uninstall \| validate \| pack` | manage third-party plugins | macOS only; needs protocol ≥24. `validate`/`pack` run offline; `install` is not available in this version |
| `test-ponte` | `<device-ponte-name>` | Ponte diagnostics | streaming output |
| `logbook` | `<limit>` | show recent logbook records | macOS/iOS, see 3.16 |
| `script-log` | `<log-name> <session-id>` | show one script execution log | macOS/iOS, see 3.16 |
| `reconnect-device` | `<mac>` | reconnect an AP client | macOS only |

## 3. Subcommand Details

### 3.0 `plugin` (macOS only, controller protocol ≥24)

Plugins are third-party extensions (JavaScript running in an isolated JavaScriptCore context, independent of the proxy core). In this release the only plugin type is `ap-controller` (integrations that populate the device panel's Wi-Fi columns and allow reconnecting clients).

Online subcommands (require a running Surge):

- `plugin list` — payload `{"plugins": [ {id, name, version, type, state, source, parameters, values, ...} ]}`. `state` is one of `unconfigured | enabled | disabled | error`; `source` is `builtin | url | unpacked`.
- `plugin info <id>` — one plugin object (same schema, always includes the `parameters` schema and current `values`).
- `plugin parameters <id>` — the parameter schema rendered for configuration: each parameter with type, required, constraints (enum values, range), default and current value, plus a ready-to-copy `plugin configure` invocation. Use this to discover what a plugin needs before configuring.
- `plugin install <manifest-url>` — download + verify (sha256) + unpack from a hosted manifest URL. **Not available in this version** (the CLI rejects it); use `plugin load-unpacked` with a local directory instead.
- `plugin load-unpacked <directory>` — register a local developer directory (containing `main.js` + `manifest.json` + 256x256 `icon.png`) as an `unpacked` plugin; re-reads the manifest on each call.
- `plugin configure <id> <key=value> ...` — set typed parameter values. Runs the plugin's `system.validate` when it declares support; on success the plugin becomes `enabled`. **A plugin must be configured before it can be used.**
- `plugin enable <id>` / `plugin disable <id>` — toggle. Enabling also selects the plugin as active for its type.
- `plugin select <type> <id|none>` — choose the active plugin for a type (only needed when more than one is enabled).
- `plugin uninstall <id>` — remove a url/unpacked plugin (builtins can only be disabled).

Offline subcommands (never connect to Surge; pure local tooling):

- `plugin validate <directory>` — parse + schema-check a plugin source directory (manifest + `main.js` + 256x256 `icon.png`).
- `plugin pack <directory> [asset-url]` — zip the package (excluding `manifest.json`) and emit a hosted `manifest.json` with the computed `asset.sha256`. Manifests live only at the hosted URL; the zip never contains one.

Typical flow for setting up a plugin (this version installs from local
directories only):

```bash
surge-cli plugin load-unpacked ~/plugins/unifi
surge-cli plugin parameters com.example.unifi   # discover what needs to be configured
surge-cli plugin configure com.example.unifi host=https://192.168.1.1 key=<api-key>
surge-cli plugin list        # confirm state == enabled
```

### 3.1 Tailscale and WireGuard diagnostics: `proxy-runtime-status`

```bash
surge-cli dump policy
surge-cli proxy-runtime-status "<policy-name>"
surge-cli proxy-runtime-status <line-hash>
```

`proxy-runtime-status` is the primary per-proxy diagnostic command and is
especially important for Tailscale and WireGuard. General status, summary, and
connectivity-test commands do not expose the tunnel's internal runtime state.
Pass the proxy's name as listed by `dump policy` (quote names containing
spaces). A `line-hash` (`POLICY::…`) is also accepted; `dump policy` does not
print it, but `policy-group list` and `dump policy-group-sub-policies` show it
in square brackets for proxies that are members of a policy group.

The common response includes traffic and speed, UDP relay support, test
capability, Internet egress (`No` for a Tailscale policy without Exit Node or a
WireGuard policy without DNS, even when it sets `test-url`: STUN, NAT type,
UDP and bandwidth tests can't work through it), runtime details, and recent
connection errors. WireGuard adds the
effective underlying policy, active TCP/UDP connection counts, and each peer's
handshake state. Tailscale adds session and error state, local addresses, Exit
Node selection, DERP connections and reachability, peer paths, and MagicDNS or
other runtime peer details when available. Its `dns` part lists the default
resolvers and their source, and `splitRoutes`: the control plane's Split DNS
routes (domain suffix -> resolvers), used for those domains even when no
default resolver is configured.

For a Tailscale or WireGuard connection, routing, relay, Exit Node, or handshake
problem, collect this command before broad log searches.

### 3.2 `dump <type>`

Supported `type` values:

- `active`
- `recent`
- `request`
- `dns`
- `dns-lookup-times` (the last 24 lookups that went to a server, in ms, oldest first; protocol ≥28)
- `traffic` (each policy's `testBytes` counts the bytes its proxy tests carried; protocol ≥35)
- `auto-test-group-result`
- `policy`
- `rule`
- `map-remote`
- `map-local`
- `profile`
- `event`
- `policy-group-sub-policies`
- `policy-usage` (each proxy's recent use score by line hash; it decays to zero ten minutes after last use; protocol ≥29)
- `traffic-stat` (optional second arg: `prefix`)
- `traffic-stat-host`
- `traffic-stat-breakdown <primary> <secondary>` (today, this month and last month by one dimension, then another; each of `host`, `policy`, `interface`, `process`, `device`, and the two must differ. `policy host` ranks each policy's hosts, `host policy` shows which policies each host used. `process` and `device` split the client that made the request: a local process path, or another device's MAC address. Protocol ≥38)
- `traffic-stat-records <today|this-month|last-month>` (the persistent records of one period merged by host, policy and interface: `[{host, policy, interface, requestCount, up, down}]`, largest first. The only traffic-stat view with request counts. Protocol ≥39)
- `traffic-stat-hourly` (today's traffic per local hour, `total` and `DIRECT`, protocol ≥28; `policy` maps each policy that carried traffic today to its hours, protocol ≥29)
- `temp-rule`
- `summary`
- `virtual-ip-db`
- `virtual-ip <ip|domain-substring>` (targeted query, see 3.11)
- `smart-group-info`
- `performance` (see 3.11)
- `rule-usage` (see 3.11)

`surge-cli -h` shows only a subset.

For profile display mode in CLI:

```bash
surge-cli dump profile original
surge-cli dump profile effective
```

### 3.3 `test <type>`

Supported `type` values:

- `v4-router`
- `dns`
- `encrypted-dns`
- `external-ip`
- `nat-type`

Note: `test-policy*` commands are separate top-level commands, not part of `test <type>`.

### 3.3.1 Encryption throughput benchmark

```bash
surge-cli benchmark encryption
surge-cli benchmark encryption 25
surge-cli benchmark encryption 100
```

`benchmark encryption [data-size-mib]` runs the encryption benchmark on the
device where Surge is running. With a remote Controller connection, it measures
the remote Surge device rather than the `surge-cli` host. The command streams
throughput and correctness results for supported stream and AEAD encryption
implementations; it does not measure network or proxy bandwidth.

The data size defaults to 100 MiB and accepts integers from 1 to 1024 MiB. Raw
chunks use `type` values `start`, `line`, and `complete`. Interrupting or
disconnecting the CLI cancels the benchmark after the active primitive call.

### 3.4 `script`

Routine forms:

```bash
surge-cli script list
surge-cli script run <cron-name>
```

`run` executes an enabled or disabled configured cron script by name and
returns its output plus result or exception.

Evaluate convenience form:

Common CLI form:

```bash
surge-cli script evaluate <script-js-path> [mock-script-type] [timeout] [engine] [argument]
```

CLI reads `<script-js-path>`, converts it to Base64, and sends it to controller `script evaluate`.

Supported `mock-script-type` strings:

- `http-request`
- `http-response`
- `cron`
- `event`
- `rule`
- `dns`
- `generic`

Supported `engine` strings:

- `auto`
- `jsc`
- `webview`

### 3.5 `set-dhcp-device` subtypes (macOS only)

```text
set-dhcp-device <mac> takeover [0|1]
set-dhcp-device <mac> disable-udp-fast-path [0|1]
set-dhcp-device <mac> address [ipv4-or-empty]
set-dhcp-device <mac> name [display-name-or-empty]
set-dhcp-device <mac> icon [icon-name-or-empty]
```

### 3.6 `external-resource`

- `external-resource list`
- `external-resource update <hash-key>`
- `external-resource update all`

`list` includes `ready`, and remote resources may include `updatedAt`.

### 3.7 `managed-profile`

- `managed-profile update`

The command forcibly checks the active managed profile, waits for download,
validation, and file replacement, and schedules a profile reload when the
content changed. It returns `updated` or `unchanged`.

### 3.7.1 `profile section` (controller protocol ≥31)

A profile can span several files through `#!include`, so it is changed one
section at a time instead of as a whole. Each section is read from and written
to the file that actually holds it; every other section and file stays byte for
byte as it was.

- `profile section list` — every section in profile order with the file holding
  it (relative to the profile directory), `editable`, a `reason` when it is not,
  its line count, and its `revision`. Sections loaded by a `[Ruleset *]`-style
  wildcard follow the wildcard header.
- `profile section get <name>` — prints only the section's text, without its
  `[header]`, so it can be saved, edited, and passed back. `--raw` adds `file`,
  `editable`, `exists`, and `revision`. The text includes sensitive values such
  as proxy passwords. For a read-only section the effective lines are printed.
- `profile section set <name> <file|-> [revision]` — replaces every line of the
  section with the content of the local file (`-` reads stdin; not combinable
  with `--password-stdin`), or creates the section at the end of the main
  profile. The whole profile is validated with the new content before anything
  is written, and the profile is reloaded afterwards. With `revision`, the
  change is refused if the section changed since it was read.

Read-only: managed (`#!MANAGED-CONFIG`) and enterprise profiles, sections
included from a URL or a managed file, sections assembled from several files,
and sections that mix their own lines with `#!include` directives. Content
must not contain another `[header]`, and `#!include` is refused in a section
stored in an included file. On iOS, the tunnel extension writes the file and
uploads it to iCloud Drive at once; a Dropbox file is uploaded by the main app
when it next becomes active. When the Surge folder in iCloud Drive holds more
than 200 files and folders, background sync is off and `set` is refused for
profiles stored there, with an error saying so.

```bash
surge-cli profile section list
surge-cli profile section get Rule > rule.txt
surge-cli profile section set Rule rule.txt <revision-from-list>
```

### 3.8 `watch` event types

Supported event names:

- `real-time-speed`
- `auto-test-group`
- `traffic`
- `request`
- `request-update`
- `summary`
- `environment`
- `dns`
- `diagnostics`
- `reload`
- `shutdown`
- `device-name-map`
- `policy-benchmark`
- `device-info`
- `dns-flush`
- `network-changed` (after the engine has settled on a new network; no payload; protocol ≥29)
- `log` (live log stream; prefer `log watch`)

Examples:

```bash
surge-cli watch request
surge-cli watch summary environment traffic
surge-cli watch speed        # CLI alias of real-time-speed, rendered as ↓/↑ rates
surge-cli watch              # unsubscribe
```

### 3.9 `rule match` / `rule explain` and temporary rules

```bash
surge-cli rule match example.com 443
surge-cli rule match https://example.com process-path=/usr/bin/curl
surge-cli rule explain https://example.com
```

Both evaluate the active rule set without creating a connection and return the
matched rule and final policy. `rule explain` additionally walks the
policy-group resolution: every group hop with its decision reason, the current
smart group pick, the underlying proxy chain, and the evaluation notes — use it
to answer "why did this request go through that policy".

Both also return `rule-source` and `matched-sub-rules` (controller protocol
41+):

- `rule-source`: `{"type": "profile", "file": "Main.conf", "line": 88}`,
  `{"type": "module", "module": "Name", "line": 12}` (line within the module),
  or `{"type": "runtime"}` for temporary and built-in rules; `null` when no rule
  matched (outbound mode, override, special hostname).
- `matched-sub-rules`: for a `RULE-SET` or `DOMAIN-SET` match, the entry that
  matched and the set holding it, innermost set first, for example
  `[{"rule": "DOMAIN-SUFFIX,example.com", "rule-set": "https://example.com/China.list"}]`.
  Domain-set entries appear as written (`.example.com`); an external rule set's
  IP index reports `IP-CIDR`/`IP-CIDR6` with the matched `address`, and its ASN
  index `IP-ASN,<n>`. Entries from a logical-rule branch that did not match are
  not included. Rule sets are compiled when loaded, so there are no line
  numbers inside a set.

To answer "is this domain covered by a rule set, and which one", run
`rule match` instead of downloading and grepping rule-set files: the answer is
the first matching rule in order, which is what actually decides routing.

A bare hostname defaults to TCP port 443; an HTTP(S) URL supplies URL, HTTP
Host, SNI, protocol, and port. `key=value` options override individual
descriptor fields: `hostname`, `dest-port` (alias `port`), `process-path`,
`user-agent`, `url`, `sni`, `http-host`, `source-address`, `source-port`,
`is-local` (alias `local`), `client-mac`, `listen-port`, `protocol`,
`device-name`. An empty value (for example `sni=`) clears an optional field.

Temporary rules: the CLI form `rule temp <list|add|remove|set-policy|flush>`
maps onto the controller commands `dump temp-rule`, `add-temp-rule`,
`del-temp-rule`, `update-temp-rule`, and `flush-temp-rule`. Temporary rules
take effect immediately, precede all profile rules, and are discarded when
Surge stops. Quote a rule that contains spaces:

```bash
surge-cli rule temp add "DOMAIN-SUFFIX,example.com,Proxy"
```

### 3.10 `dns lookup` / `dns trace` / `geoip`

```bash
surge-cli dns lookup example.com
surge-cli dns trace example.com interface=en0
surge-cli geoip 8.8.8.8
```

`dns lookup` resolves through Surge's DNS pipeline and reports A/AAAA records,
the answering server, interface, path, timing, and cache expiry. `dns trace`
additionally includes the resolver trace log. `interface=<bsd-name>` forces the
lookup through one network interface and fails when it is unavailable.

`geoip` looks up an IP address in the local GeoIP and ASN databases — the same
data `GEOIP` and `IP-ASN` rules match against — and reports the region code,
ASN, AS organization, and both database dates. Fields are `null` when the
address is not present in a database.

### 3.11 `dump performance` / `dump rule-usage` / `dump virtual-ip`

- `dump performance`: engine memory footprint (`memory-bytes`), uptime, active
  request count, DNS cache entries, virtual IP entries, temporary rule count,
  and active ban count. Useful when tracking the iOS Network Extension memory
  limit on a remote device.
- `dump rule-usage`: per-rule match counters accumulated since the app last
  collected them (the apps drain the counters periodically, on iOS every 6
  hours). The dump itself is non-destructive.
- `dump virtual-ip <ip|domain-substring>`: targeted query of the virtual IP
  database — exact match for an IPv4 address, case-insensitive substring match
  for a domain. `dump virtual-ip-db` remains the full dump.

### 3.12 `benchmark rule-matching`

```bash
surge-cli benchmark rule-matching
```

Measures the average matching time of the active rule set using random
hostnames (worst-case full scan; the result is a single response with
`average-ns`, not a stream). Useful for judging the cost of very large rule
sets on the device running Surge.

### 3.13 `vmnet` (macOS only)

```bash
surge-cli vmnet status
surge-cli vmnet arp
surge-cli vmnet ndp
surge-cli vmnet ra
```

Inspects the VMNET virtual interface that backs the enhanced/gateway mode.
`status` always answers (reporting `running: false` when the interface is
down); the table commands error with "The VMNET virtual interface is not
active" when the interface is not running.

- `status`: interface configuration — main interface and MACs, IPv4 self/router
  addresses, IPv6 link-local/global addresses, advertised prefix, IPv6 router,
  MTU, and the sizes of the ARP/NDP/RA tables.
- `arp`: the IPv4 neighbor table learned from gateway clients (`ip`, `mac`,
  `age-seconds`).
- `ndp`: the IPv6 neighbor table in the same shape.
- `ra`: IPv6 RA takeover state — per-client MAC, learned link-local address,
  and time since the last RA sent; known routers with their remaining RA
  lifetimes (these are excluded from takeover while valid); and blacklisted
  clients.

Use `arp`/`ndp` when a gateway client cannot be reached, and `ra` when IPv6
takeover does not appear to affect a device.

### 3.14 Daily management commands

These commands provide stable, task-oriented entry points so clients do not
need to know the internal `environment` key paths:

```bash
surge-cli status
surge-cli dump summary
surge-cli version

surge-cli mode
surge-cli mode set rule
surge-cli global-policy
surge-cli global-policy set "Proxy"

surge-cli policy-group list
surge-cli policy-group get "Proxy"
surge-cli policy-group set "Proxy" "Hong Kong"
surge-cli policy-group set "Automatic" auto

surge-cli policy-avoid list
surge-cli policy-avoid add "HK 01"     # passes the latency test but performs poorly
surge-cli policy-avoid remove "HK 01"
surge-cli policy-avoid clear

surge-cli profile list
surge-cli profile current
surge-cli profile diff
surge-cli profile check "Default.conf"
surge-cli profile switch "Default.conf"

surge-cli module list
surge-cli module show "Module A"
surge-cli module enable "Module A" "Module B"
surge-cli module disable "Module A"

surge-cli script list
surge-cli script run "Daily Job"

surge-cli feature list
surge-cli feature get mitm
surge-cli feature set mitm on

surge-cli device list
surge-cli device show AA:BB:CC:DD:EE:FF
```

`feature` names available on all supported controller platforms are `mitm`,
`rewrite`, `scripting`, `capture`, `packet-capture`, and `cellular-mode`.
macOS additionally exposes `system-proxy` and `enhanced-mode`.

Mutation commands return the resulting state, not just a generic success
message. `feature set system-proxy` and `feature set enhanced-mode` wait for
the actual state transition and fail if it does not complete. An invalid
`profile check` also returns a command error, making its CLI exit status useful
in automation.

Profile `list` and
`check`, and all `device` operations, are available only on macOS. `status`
displays the active profile's absolute path in `profile-path`; profiles that do
not originate from a local file report no path.

### 3.14.1 `capture-filter` (controller protocol ≥36)

Surge keeps two filters that decide which requests are recorded: `in-memory`
applies to the recent requests kept while HTTP capture is off, and `on-disk` to
an HTTP capture session (`feature set capture on`). `list` marks the one in
effect. A request is hidden when a hide option matches it, when `http-only` is
on and it is not HTTP, or when the keyword filter rejects its URL.

```bash
surge-cli capture-filter list
surge-cli capture-filter get on-disk
surge-cli capture-filter set on-disk http-only=on type=with-keywords keywords=example.com,api.example.net
surge-cli capture-filter set in-memory type=pattern keywords= add-keyword='-*google*' add-keyword='*'
surge-cli capture-filter set on-disk disable-keyword=example.com
```

`set` options are applied in order, and nothing changes if one is invalid:

| Option | Values | Meaning |
|---|---|---|
| `http-only` | `on\|off` | record only HTTP/HTTPS requests |
| `hide-crash-reporter` | `on\|off` | hide crash reporter and analytics requests (default on) |
| `hide-apple` | `on\|off` | hide Apple and iCloud requests |
| `hide-udp` | `on\|off` | hide UDP sessions |
| `type` | `off\|with-keywords\|without-keywords\|pattern` | `with-keywords` keeps URLs containing an enabled keyword; `without-keywords` keeps URLs containing none; `pattern` keeps URLs matching a pattern (`*`, `?`; prefix `-` excludes a hostname) |
| `keywords` | `a,b,...` | replace the list; empty value clears it |
| `add-keyword` / `remove-keyword` | one entry | add (or re-enable) / remove an entry; use `add-keyword` for entries containing a comma |
| `enable-keyword` / `disable-keyword` | one entry | toggle an entry while keeping it in the list |

Raw JSON (`--raw`): `list` returns `{"active": "<scope>", "filters": {"in-memory": {...}, "on-disk": {...}}}`;
`get` and `set` return `{"scope", "active": bool, "filter": {...}}`. A filter is
`{httpOnly, hideCrashReporterRequests, hideAppleRequests, hideUDP, type, keywords, disabledKeywords}`.
Prefer this command over `set InMemoryCaptureFilter...` / `set OnDiskCaptureFilter...`.

### 3.14.2 HTTP capture workflow and `capture-session` (controller protocol ≥37)

`dump recent` keeps only the latest requests. An HTTP capture session saves
every request it records, with headers and bodies, to disk; `capture-session`
reads those sessions, locally or on Surge iOS through `--remote`. Run a
session end to end like this:

```bash
# 1. Optional: narrow what is recorded (3.14.1)
surge-cli capture-filter set on-disk http-only=on type=with-keywords keywords=example.com
# 2. Limits, then start. Defaults are 180 s / 100 requests / 50 MB; 0 = none.
#    Setting limits and Replica=1 in one call starts the session with them.
surge-cli set ReplicaSessionParameters.timeLimit=1800 ReplicaSessionParameters.requestCountLimit=0 Replica=1
# 3. Let the user exercise the app; confirm recording
surge-cli capture-session list                 # newest first; the new one is active
# 4. Stop (or let a limit end it; feature get capture shows the state)
surge-cli feature set capture off
# 5. Read the results
surge-cli --raw capture-session list
surge-cli --raw capture-session dump 2026-11-03-102105 limit=100
surge-cli --raw capture-session dump 2026-11-03-102105 filter=api.example.com
surge-cli --raw capture-session data 2026-11-03-102105 '<key>' response
```

Before starting, tell the user:

- Turning capture on or off closes all existing connections.
- While capturing, hostnames in the capture MITM override list (by default
  everything except Apple, iCloud, App Store CDN, Facebook, Instagram,
  Twitter, Dropbox, and bare IPs) are decrypted even if MITM is off. That needs
  a CA certificate in the profile that the device trusts; pinned apps fail.
  `ReplicaSessionParameters.mitmOverride=0` limits decryption to the profile's
  `[MITM]` hostnames.
- Changing `ReplicaSessionParameters.*` during a session ends it
  (`endReason: replaced`) and starts a new one. Set limits first.
- Limits persist in the environment (4.4) and are the app's own settings;
  restore them afterwards if the user did not ask to keep them.

Reading results:

- Address a session by `name` and a request by `key`, both from the previous
  step's output. Request ids repeat within a session (they restart with the
  engine), so never address saved requests by id. Quote both: they contain
  spaces.
- `list` reports `requestCount` and `active` (capture is writing to it now).
  Sessions started by HTTP capture in protocol ≥37 also carry `source`,
  `startDate`, `endDate`, `endReason` (`stopped | replaced | time-limit |
  size-limit | request-count-limit`; absent if the engine stopped mid-session),
  `limits` (`{time, size, requestCount}`, 0 = none) and `filter` (the on-disk
  filter when the session started, as in 3.14.1). `include-size` adds `size`
  but reads every file; skip it unless size matters. Rules with
  `always-capture=<session-name>` write to sessions of that name, which have
  none of the start/end fields.
- `dump` returns `{session, active, total, offset, returned, requests,
  matched?}`, records in save order using the `dump recent` record format plus
  `key`. `limit` defaults to 100 (max 500). `filter` is a case-insensitive
  substring of URL, host, address, policy, rule, process, device, status, or
  method; with it, `matched` counts the hits and `offset` pages within them.
  Page until `offset + returned` reaches `total` (or `matched`).
- `data` reads up to `length` bytes (default 524288, max 1048576) from
  `offset`. The CLI prints text; with `--raw` the payload is `{session, key,
  type, length, offset, truncated, data}` with `data` in base64. When
  `truncated` is true, repeat with `offset` advanced by the bytes received.
- Bodies are stored as transferred. If `responseHeader` (or `requestHeader`)
  has `Content-Encoding: gzip|br|deflate`, decode after base64, e.g.
  `... | jq -r .data | base64 -d | gunzip`. An error means no body was saved
  (none sent, or the HTTPS traffic was not decrypted).
- A response that ended with a trailer section (gRPC status, for example)
  carries it in `responseTrailer` (protocol ≥43).
- Prefer this over `retrieve-data`, which streams over a raw data channel the
  CLI does not render and can only find saved requests given an absolute
  directory path.

MCP equivalents: `set_capture_filter`, `set_environment`, `set_feature`,
`list_capture_sessions`, `list_capture_session_requests`,
`get_capture_session_body`. HTTP API: `/v1/capture/filters`,
`/v1/features/capture`, `/v1/capture/sessions[/requests|/data]`; it has no
endpoint for the limits.

### 3.15 First-line network diagnostics: `dump summary`

```bash
surge-cli dump summary
```

Use `dump summary` near the start of network troubleshooting. It returns a
passive snapshot of the current network setup and does not send probes or
change any settings. Depending on the platform and active network, it can show:

- profile configuration warnings and performance-impact warnings;
- available and primary interfaces, IP addresses, and the default IPv4 router;
- Wi-Fi or cellular details when available;
- effective plain and encrypted DNS servers;
- subnet-specific behavior such as TCP Fast Open and cellular fallback.

The `Network Indicators` values for external IP, NAT type, and bandwidth are
not active test results. Use `test external-ip`, `test nat-type`,
`test v4-router`, `test dns`, `test encrypted-dns`, or the corresponding
`test-policy-*` command when an active measurement is needed.

With `--raw`, the response also includes `canPingRouter`, `canTestDNS`, and
`canTestEncryptDNS`, which indicate which follow-up tests are available, and
(protocol ≥28) a `network` object with the primary network's `type`
(`wired`, `wifi`, `cellular` or `unknown`), `ssid`, `interface`,
`ipv4-address` and `ipv4-router`. From protocol 30 it also has booleans
`ipv4` and `ipv6`, whether the network offers each protocol, and from protocol 33
`encrypted-dns`, whether DNS goes to encrypted servers.

### 3.16 Log commands

Read retained logs:

```bash
surge-cli log
surge-cli log 500
surge-cli log file 1000
surge-cli log memory 500
```

`log` returns the latest 100 lines from `file` by default. A number by itself
changes the line count while keeping the default source. The permitted range is
1 to 10000 lines, and output is ordered from older to newer.

| Source | Contents | Best for |
|---|---|---|
| `memory` | all log levels, limited to the most recent entries | investigating something that just happened with maximum detail |
| `file` | the complete history retained in the current log file, limited to the configured log level | reviewing a longer time range |

Use `memory` for recent detail and `file` for longer history.

Watch new logs:

```bash
surge-cli log watch
```

`log watch` prints new, unfiltered log lines from the moment the subscription
starts. It does not replay either retained source. The command keeps running
until interrupted and may remain quiet when no new logs are produced.

With `--raw`, a retained-log response contains `source`,
`requested-line-count`, `line-count`, and `log`. Each watched log event contains
`level`, `module`, and `log`.

Related commands:

```bash
surge-cli set-log-level <log-level>
surge-cli logbook <limit>
surge-cli script-log <log-name> <session-id>
```

- `set-log-level` changes the runtime file log level without modifying the
  profile.
- `logbook` displays recent structured logbook records, newest first. The
  payload is `{"records": [...], "truncated": <bool>}`; since controller
  protocol 27 the server caps the response size (about 3 MB on iOS, 15 MB on
  macOS) and skips records that do not fit, setting `truncated` to `true`.
- `script-log` displays the log from one script execution.

### 3.17 Human-readable parsers

Unless `--raw` is used, the CLI has dedicated presentation parsers for all
user-facing `dump` types, environment tests, policy tests, policy runtime
status, daily management commands, external resources, Ponte diagnostics,
managed-profile updates, logbook records, and script logs. Mutation commands
whose useful response is only `success` continue to use the generic result
parser. Binary/data-channel commands such as `retrieve-data`,
`get-resource device-icon`, and `provider-message` intentionally retain
JSON/data-oriented output.

## 4. `set` Command and Environment Dictionary (Key Section)

### 4.1 Syntax

```bash
surge-cli set <key-path>=<value> [<key-path>=<value> ...]
```

- Multiple `key=value` pairs are allowed in one command.
- Any argument without `=` fails with `Illegal parameter`.
- `<nil>` and `(null)` are treated as `nil`.

### 4.2 Key-path behavior

- Normal key-paths are applied via key-path assignment.
- Prefix `ProxyGroupSelection.` is handled as map merge for select-group decisions.
- Prefix `AutoPolicyGroupOverride.` is handled as map merge for auto-group overrides.

Examples:

```bash
surge-cli set ProxyMode=2
surge-cli set ProxyGroupSelection.Proxy=HK
surge-cli set AutoPolicyGroupOverride.Streaming=<nil>
surge-cli set RewriteEnabled=0 ScriptingEnabled=1
```

### 4.3 Top-level environment keys

| Key | Type | Meaning | Example |
|---|---|---|---|
| `ProxyGroupSelection` | `dict<string,string>` | current selection for select groups | `ProxyGroupSelection.<group>=<policy>` |
| `AutoPolicyGroupOverride` | `dict<string,string\|nil>` | override selection for auto groups | `AutoPolicyGroupOverride.<group>=<policy-or-<nil>>` |
| `AvoidedPolicies` | `array<string>` | policies automatic groups avoid | `set` cannot write an array (a string clears the list); use `policy-avoid` |
| `ProxyMode` | `int` | outbound mode: `0=Direct` `1=Global Proxy` `2=Rule` | `ProxyMode=2` |
| `AllProxyModePolicyNameKey` | `string` | policy name used in global proxy mode | `AllProxyModePolicyNameKey=ProxyA` |
| `MitMEnabled` | `bool` | MITM switch | `MitMEnabled=1` |
| `RewriteEnabled` | `bool` | Rewrite switch | `RewriteEnabled=1` |
| `ScriptingEnabled` | `bool` | Scripting switch | `ScriptingEnabled=1` |
| `Replica` | `bool` | HTTP capture switch | `Replica=1` |
| `ReplicaSessionParameters` | `dict` | HTTP capture session parameters | see 4.4 |
| `InMemoryCaptureFilter` | `dict` | in-memory capture filter params | see 4.5 |
| `OnDiskCaptureFilter` | `dict` | on-disk capture filter params | see 4.5 |
| `PacketCaptureEnabled` | `bool` | packet capture switch | effective on iOS/tvOS |
| `PacketCaptureParameters` | `dict` | packet capture parameters | see 4.6 |
| `SGEnvironmentCellularModeEnabledKey` | `bool` | cellular mode switch | `SGEnvironmentCellularModeEnabledKey=1` |
| `SGEnvironmentCellularModeProcessPathsKey` | `array<string>` | allowed process paths in cellular mode | complex type, see 4.7 |

### 4.4 `ReplicaSessionParameters` fields

| Field | Type | Default |
|---|---|---|
| `sizeLimit` | `int` | `52428800` (50MB) |
| `requestCountLimit` | `int` | `100` |
| `timeLimit` | `int` (seconds) | `180` |
| `mitmOverride` | `bool` | `1` |
| `mitmOverrideHostnames` | `array<string>` | built-in default list |
| `mitmOverrideHostnamesDisabled` | `array<string>` | empty |

Example (scalar updates are straightforward):

```bash
surge-cli set ReplicaSessionParameters.requestCountLimit=200 Replica=1
```

Before Surge iOS 6.0.0 / Mac 6.11.0, a nested key path such as
`ReplicaSessionParameters.timeLimit` was silently dropped until the app had
saved capture settings once. See 3.14.2 for the full capture workflow.

### 4.5 `InMemoryCaptureFilter` / `OnDiskCaptureFilter` fields

With controller protocol ≥36, change these through `capture-filter set` (3.14.1) instead of raw key paths.

| Field | Type | Meaning |
|---|---|---|
| `httpOnly` | `bool` | HTTP-only capture |
| `hideCrashReporterRequest` | `bool` | hide crash reporter traffic (default `1`) |
| `hideAppleRequest` | `bool` | hide Apple traffic |
| `hideUDP` | `bool` | hide UDP traffic |
| `filterType` | `int` | `0=None` `1=Whitelist` `2=Blacklist` `3=Pattern` |
| `keywordFilter` | `array<string>` | keyword list |
| `disabledKeywordFilter` | `array<string>` | disabled keywords |

### 4.6 `PacketCaptureParameters` fields

| Field | Type | Default |
|---|---|---|
| `sizeLimit` | `int` | `1048576` (1MB) |
| `packetCountLimit` | `int` | `100` |
| `timeLimit` | `int` (seconds) | `180` |
| `packetType` | `int` | `0=Unknown` `1=ICMP` `6=TCP` `17=UDP` |

### 4.7 Type handling notes (important for agents)

- CLI sends values as strings; booleans/integers rely on runtime conversion (`boolValue` / `integerValue`).
- Complex arrays/dictionaries are not ideal to set as raw string literals from shell commands.
- Recommended approach:
  - prefer scalar key-path updates;
  - use JSON/SDK path for complex structures when possible;
  - fetch `environment` first, then apply minimal deltas.

### 4.8 Runtime behavior notes

- Successful `set` triggers environment-change notifications.
- If `MitMEnabled=1` is invalid under current runtime conditions, it is auto-corrected to `0`.
- In global proxy mode (`ProxyMode=1`), an invalid `AllProxyModePolicyNameKey` is auto-fallbacked to a valid policy (or `DIRECT`).

## 5. Practical Recommendations for AI Agents

1. Use the default rendered output; do not pass `--raw` unless a documented
   field is unavailable in the rendered form.
2. Start network troubleshooting with `status` and `dump summary`; before
   mutating settings, also collect relevant context with `environment`,
   `dump policy`, and `dump profile`.
3. For streaming commands (`diagnostics`, `test-policy-bandwidth`, `benchmark encryption`, `test-ponte`), handle incremental chunks and end conditions.
4. Check platform capability before using platform-limited commands (`update-profile`, `set-dhcp-device`, `provider-message`).
5. Change profile content with `profile section get` / `set` instead of editing files: it routes each section to the file that holds it and validates the whole profile first. Pass the revision from `list` so a concurrent change is not overwritten.
