# NetWork-Module

## 说明
这是仓库根目录。

当前仓库按客户端归属整理，只保留模块、面板、小组件、脚本和规则清单等可复用内容，不再混放不同客户端资源。

## 给 Agent 的约定（重要）

**本仓库是 `lylywayr` 名下的网络客户端模块仓库。**

> 任何 agent / 自动化流程需要把 Surge、Loon、QuantumultX、Egern、Stash、Clash、Shadowrocket、
> Sub-Store 的模块、面板、脚本、插件、覆写、自用规则放到 GitHub 时，**直接提交到本仓库**
> （`lylywayr/NetWork-Module`，默认分支 `main`），按下面的客户端目录归档，并补齐模块 `README.md`。
>
> 模块的上游来源（仓库、作者、许可证、同步版本）和本地改动，必须写进模块 `README.md` 的「来源」一节；
> 从上游 raw 直接取原文，不复制二手转载，方便溯源和后续同步。

在 Open Minis、WorkBuddy、Codex、Claude Code、Cursor、Copilot 里产生的自用规则与模块，
同样默认进这里，不用再问放哪个仓库。

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

不在表里的客户端（sing-box、Karing、Hiddify 等）按同样结构新增目录：`<客户端>/README.md` + 模块目录 + `Rules/`，并在本表登记。

## 规则与配置
- 规则清单 / 规则集放 `<客户端>/Rules/`，例如 `Surge/Rules/`。
- 当前只有 `Surge/Rules/`：`Muse.list`、`ZhipuExtra.list`，用途与引用示例见该目录 README。
- Clash 用 `payload:` 的 yaml，Loon / Stash / QuantumultX / Shadowrocket 用 `.list`，Egern 用 yaml 规则集。
- 规则文件的 raw 路径同样永久固定，改名等于让引用它的配置全部失效。

## 结构规则
- 一级目录是仓库根目录。
- 二级目录是客户端目录。
- 三级目录是具体模块目录，Surge 按用途加前缀：`模块-` / `面板-` / `脚本-`。
- 每一级目录都保留 `README.md` 说明用途和维护方式。
- 模块目录内放同一功能的模块文件、依赖脚本和来源说明。
- 规则清单放 `<客户端>/Rules/`，属于资源目录，不进模块清单。
- `tools/` 放仓库自检脚本，提交前跑 `python3 tools/check_repo.py`。

## 链接规范
- 模块与规则里的脚本、安装地址、规则引用都指向本仓库的 raw 链接：
  `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/<路径>`
- 分支名区分大小写，本仓库默认分支是 `main`。
- 路径含中文或空格时，必须做 URL 编码。

## README 规范
- 无论仓库、客户端还是模块层级，`README.md` 默认使用中文编写。
- 如有必要，可以补充少量英文说明，但中文应始终作为主说明语言。
- 模块级 README 至少包含：说明、文件清单、安装地址、参数（如有）、来源、维护记录。
- 有上游的模块，`来源` 段要写明「上游原版保存在本目录 `上游/`」，并链到 `上游/SOURCE.md`。
- 规则目录 README 至少包含：说明、清单表（文件 / 用途 / 来源 / 更新方式）、引用示例、维护记录。

## 变更记录
- 2026-11-24：移除全部 kelee（可莉）来源模块（含本地化与二改版本）：Auto_Join_TF、Fileball_mount、Spotify 歌词翻译、TikTok 重定向、VVebo 修复、WPS_checkin、微信外链解锁、YouTube 字幕翻译、Kelee2Egern、LoonKissSurge2Egern、脚本-PluginHub、Google、QuickSearchn、UnnooQuan 去水印、sxmd_sign，以及 JD_Price 的 kelee 版。
- 2026-11-24：补强 Agent 约定：README 三层同步、路径永久固定（链接即 API）、上游溯源；新增 `tools/check_repo.py` 自检；修正各客户端 README 清单。
- 2026-11-13：清空来自 Kelee 的去广告内容（`Fanqie/`、`Surge/模块-番茄小说去广告/`、`Loon/模块-番茄小说去广告/`）及对应的 GitHub Actions 定时同步。
- 2026-11-13：从 `surge-modules`、`Surge`、`egern`、`MySelf`、`resource`、`whos` 汇总迁入 35 个模块（并补 `Egern/WhosTV签到`），依赖脚本本地化，链接统一指向本仓 raw。
