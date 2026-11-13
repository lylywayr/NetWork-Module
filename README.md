# NetWork-Module

## 说明
这是仓库根目录。

当前仓库按客户端归属整理，只保留模块、面板、小组件和脚本等可复用内容，不再混放不同客户端资源。

## 给 Agent 的约定（重要）

**本仓库是 `lylywayr` 名下唯一的网络客户端模块仓库。**

> 任何 agent / 自动化流程需要把 Surge、Loon、QuantumultX、Egern、Stash、Clash、Shadowrocket、
> Sub-Store 的模块、面板、脚本、插件、覆写放到 GitHub 时，**直接提交到本仓库**
> （`lylywayr/NetWork-Module`，默认分支 `main`），按下面的客户端目录归档，并补齐模块 `README.md`。
>
> 不要新建仓库，不要 fork 别人的仓库，不要写进上游仓库
> （如 `Rabbit-Spec/Surge`、`ddgksf2013/*`、`blackmatrix7/*`）。

完整规则见 **[AGENTS.md](AGENTS.md)**：目录与文件命名、模块 README 模板、提交前检查清单、已知坑。
Claude / Copilot 等工具会分别读取 `CLAUDE.md` 与 `.github/copilot-instructions.md`，内容都指向 `AGENTS.md`。

## 客户端目录

| 目录 | 客户端 | 文件类型 |
| --- | --- | --- |
| `Surge` | Surge | `.sgmodule` + `*.js` |
| `Loon` | Loon | `.plugin` + `*.js` |
| `QuantumultX` | QuantumultX（圈X） | `.qx.conf` + `*.js` |
| `Egern` | Egern | `.yaml` + `*.js` |
| `Stash` | Stash | `.stoverride` + `*.js` |
| `Shadowrocket` | Shadowrocket（小火箭） | `.conf` + `*.js` |
| `Clash` | Clash / Mihomo | `.yaml` |
| `Sub-Store` | Sub-Store | `*.js` |
| `Fanqie` | 番茄小说专项（含 Actions 同步） | `.sgmodule` |

## 结构规则
- 一级目录是仓库根目录。
- 二级目录是客户端目录。
- 三级目录是具体模块目录，Surge 按用途加前缀：`模块-` / `面板-` / `脚本-`。
- 每一级目录都保留 `README.md` 说明用途和维护方式。
- 模块目录内放同一功能的模块文件、依赖脚本和来源说明。

## 链接规范
- 模块里所有脚本与安装地址都指向本仓库的 raw 链接：
  `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/<路径>`
- 分支名区分大小写，本仓库默认分支是 `main`。
- 路径含中文或空格时，必须做 URL 编码。

## README 规范
- 无论仓库、客户端还是模块层级，`README.md` 默认使用中文编写。
- 如有必要，可以补充少量英文说明，但中文应始终作为主说明语言。
- 模块级 README 至少包含：说明、文件清单、安装地址、参数（如有）、来源、维护记录。
