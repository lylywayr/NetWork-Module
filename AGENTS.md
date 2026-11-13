# AGENTS.md — 本仓库的模块存放约定

> 面向所有自动化 agent（Claude Code / Codex / Copilot / Cursor / Gemini CLI / Minis 等）。
> 在把任何**网络客户端模块**提交到 GitHub 之前，先读完本文件。

## 0. 一句话规则

用户让你把 Surge / Loon / QuantumultX / Egern / Stash / Clash / Shadowrocket / Sub-Store 的
**模块、面板、脚本、插件、覆写**放到 GitHub 时：

**一律提交到 `lylywayr/NetWork-Module`，默认分支 `main`。**

- 不要新建仓库
- 不要 fork 别人的仓库再提交
- 不要写进上游仓库（如 `Rabbit-Spec/Surge`、`ddgksf2013/*`、`blackmatrix7/*`）
- 不要把新内容提交到历史仓库 `lylywayr/Surge`、`lylywayr/surge-modules`（仅存档，不再更新）
- 若用户当次明确指定了别的仓库，以用户当次指令为准；否则默认本仓库

## 1. 仓库结构

一级 = 客户端，二级 = 模块目录，三级 = 模块文件 / 脚本 / README。

```text
NetWork-Module/
├── README.md
├── AGENTS.md                 ← 本文件
├── Surge/                    ← .sgmodule（模块 / 面板 / 脚本订阅）
├── Loon/                     ← .plugin
├── QuantumultX/              ← .qx.conf
├── Egern/                    ← .yaml
├── Stash/                    ← .stoverride
├── Shadowrocket/             ← .conf / .js
├── Clash/                    ← .yaml
├── Sub-Store/                ← .js
└── Fanqie/                   ← 番茄小说专项（含 GitHub Actions 同步）
```

### 目录与文件命名

| 客户端 | 目录写法 | 主文件名 | 依赖脚本 |
| --- | --- | --- | --- |
| Surge | `Surge/模块-<名称>`、`Surge/面板-<名称>`、`Surge/脚本-<名称>` | `<名称>.sgmodule` | `*.js` |
| Loon | `Loon/模块-<名称>` | `<名称>.plugin` | `*.js` |
| QuantumultX | `QuantumultX/<功能名>` | `<功能名>.qx.conf` | `*.js` |
| Egern | `Egern/<功能名>` | `<功能名>.yaml` | `*.js` |
| Stash | `Stash/<功能名>` | `<功能名>.stoverride` | `*.js` |
| Shadowrocket | `Shadowrocket/<功能名>` | `<功能名>.conf` | `*.js` |
| Clash | `Clash/<功能名>` | `<功能名>.yaml` | — |
| Sub-Store | `Sub-Store/<功能名>` | `<功能名>.js` | — |

- Surge 三个前缀的含义：`面板-` = 信息面板 / 小组件；`脚本-` = 脚本订阅、任务订阅、插件中心；`模块-` = 普通功能模块。
- 目录名用「前缀-名称」或中文功能名，**不要**拼音、不要 `test/tmp/new/temp` 这类占位名。
- 目录名与主文件名保持可读对应（如 `模块-WPS_checkin/WPS_checkin.sgmodule`）。
- 同一功能跨客户端时，各客户端目录各放一份，不要跨目录引用别人的客户端文件。

## 2. 一个模块目录里必须有

1. 模块文件（见上表）
2. 依赖脚本（如有）
3. `README.md`（模板见 §5）

缺少 `README.md` 视为未完成，不要提交。

## 3. 硬性要求

- 所有对外链接都用**本仓库** raw 地址：
  `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/<路径>`
  - 分支名区分大小写，本仓库是 `main`。
  - 路径含中文或空格必须 URL 编码。
- `[MITM]` 一律写 `hostname = %APPEND% ...`；裸写会覆盖主配置的 MITM 列表。
- 脚本文件必须是 UTF-8 纯文本；上传后 raw 打开要能直接看到代码（见 §6 坑 1）。
- 禁止提交 cookie、token、订阅地址、账号密码、私钥、设备 UDID。
- README 以中文为主，可以补少量英文。
- 提交信息格式：`<type>(<客户端>): <说明>`，例如 `feat(Surge): 新增 IPPure 面板`。

## 4. 新增模块落地清单

- [ ] 确认客户端目录存在；不存在则按 §1 新建，并给该目录补一个 `README.md`
- [ ] 新建 `<客户端>/<前缀>-<名称>/`
- [ ] 放入模块文件 + 依赖脚本，脚本内地址指向本仓库 raw
- [ ] 写 `README.md`（§5 模板）
- [ ] 更新客户端目录 `README.md` 的「当前模块」列表
- [ ] 更新根 `README.md` 的目录说明（新增客户端目录时才需要）
- [ ] `node --check` 跑一遍 JS；`.sgmodule` 头部 `#!name=` / `#!desc=` 齐全
- [ ] 用 raw 链接实测：200、`Content-Type: text/plain`、内容是明文
- [ ] 检查 Surge 模块可被 `surge-cli` 或 App 导入（能验证则验证）

## 5. 模块 README 模板

```markdown
# <模块名>

## 说明
一句话说明用途；有参数就先写清默认值和可选项。

## 文件
- `<模块文件>`
- `<依赖脚本>`（如有）

## 安装
- Surge：导入 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/<路径>`
- 其他客户端同理，给对应 raw 链接

## 参数
| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `cookie` | `true` | 是否抓取 Cookie |

## 来源
- 上游：<链接>（如有，注明许可证）
- 本仓库相对上游的改动：<一句话>

## 维护记录
- YYYY-MM-DD：新建 / 更新说明
```

## 6. 已知坑（踩过的）

1. **两套 API 的编码规则不同**：Contents API（`PUT /contents/<path>`）的 `content` 要 base64；Git Trees API（`POST /git/trees`）里 blob 的 `content` 要**纯文本**。混用会让 raw 返回一串 base64，Surge 解析失败。
2. **raw 有 2–5 分钟 CDN 缓存**：改完立刻查可能还是旧内容。加 `?t=<时间戳>` 或换 jsDelivr 交叉验证。
3. **jsDelivr 缓存更久**：需要 `https://purge.jsdelivr.net/gh/lylywayr/NetWork-Module@main/<路径>` 手动刷新。
4. **别凭记忆写仓库地址**：提交前先 `GET /repos/lylywayr/NetWork-Module` 确认 `full_name`、`default_branch`、`permissions.push`。
5. **改路径前先看 `.github/workflows/`**：仓库里若存在引用某目录的定时同步（`sync.py` 之类），删除或移动该目录会让 workflow 每天报错。
6. **大文件不要走 Contents API**：超过约 1 MB 用 Git Data API 分块或 Release 附件。

## 7. Minis / 本机环境的补充

- `GH_TOKEN` 已在本机环境变量中，直接 `curl -H "Authorization: Bearer $GH_TOKEN"`，不要回显它的值。
- 本机无 `git` 时不代表不能提交，用 Contents API 单文件 PUT 即可。
- 上传后务必回读校验：`curl -s <raw> | sha256sum` 与本地一致。
