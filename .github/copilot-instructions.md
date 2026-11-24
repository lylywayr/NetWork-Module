# Copilot Instructions

本仓库是用户主要的网络客户端模块仓库：`lylywayr/NetWork-Module`（默认分支 `main`）。
完整约定见仓库根目录的 `AGENTS.md`。

要点：

- 新增 Surge / Loon / QuantumultX / Egern / Stash / Clash / Shadowrocket / Sub-Store 的模块时，提交到对应客户端目录下的 `<前缀>-<名称>/`。
- 主人在 Open Minis、WorkBuddy、Codex、Claude Code、Cursor、Copilot 里产生的自用规则与模块，默认提交到本仓库，不需要反问放哪个仓库。
- 每个模块目录包含：模块文件（`.sgmodule` / `.plugin` / `.qx.conf` / `.yaml` / `.stoverride` / `.conf` / `.js`）、依赖脚本（如有）、`README.md`（中文）。
- 新增 / 改名 / 删除模块时，必须同步更新客户端目录 `README.md` 的「当前模块」清单（格式见 `AGENTS.md` §2.1），与模块 `README.md` 在同一个提交里完成。
- 模块目录名与主文件名是永久路径：发布后不改名、不删除、不带日期和数量词；改内容只动文件内部，否则已发出的 raw 链接会 404。
- 三级目录名 = 品牌 + 功能（例：`模块-五菱签到抽奖`），不写 `模块-WulingSign` 这类裸品牌。
- 一种功能只能有一个三级目录，不做目录级版本分叉；变体放同一目录内。
- 规则清单 / 规则集默认也进本仓库：放 `<客户端>/Rules/`，该目录需要 README；规则文件路径同样永久固定。
- 客户端不限于已列出的八种，新客户端目录按 `AGENTS.md` §1.2 登记，并在根 README 表格里加一行。
- 提交前跑 `python3 tools/check_repo.py`，必须 `0 error`。
- 所有链接使用 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/<路径>`。
- 模块必须可溯源：上游仓库、原作者、许可证、同步版本写进 `README.md`「来源」；本地化脚本注明相对上游的改动。
- 派生/二改他人模块：按 `AGENTS.md` §1.4 建层级（顶层本仓版 + `上游/原版-*` + `SOURCE.md`），§1.5 六步流程执行。
- 有上游或二改的模块：目录内建 `上游/`，原样保存上游模块与脚本（`原版-` 前缀）+ `SOURCE.md`，README 说明快照内容。
