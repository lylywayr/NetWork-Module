# CLAUDE.md

本仓库的完整工作约定见 **[AGENTS.md](AGENTS.md)**，动手前先读。

速记：

- 这是 `lylywayr` 名下的网络客户端模块仓库：`lylywayr/NetWork-Module`，默认分支 `main`。
- 所有 Surge / Loon / QuantumultX / Egern / Stash / Clash / Shadowrocket / Sub-Store 的模块、面板、脚本、插件、覆写、自用规则，都直接提交到这里。
- 主人在 Open Minis、WorkBuddy、Codex、Claude Code、Cursor、Copilot 里让 agent 上传时，同样默认本仓库，不要反问放哪个仓库。
- 归档路径：`<客户端目录>/<前缀>-<名称>/`，目录内必须有模块文件、依赖脚本（如有）和 `README.md`。
- 新增 / 改名 / 删除模块：模块 `README.md` 与**客户端目录 `README.md` 的「当前模块」清单**必须同一提交改完，清单只写目录名。
- 目录名与主文件名发布后永久固定：raw 路径就是对外 API，改名 / 删除会让已装设备 404，只能保留旧路径。
- 规则清单 / 规则集同样默认进本仓库：`<客户端>/Rules/`，目录里要有 README；规则文件路径也永久固定。
- 客户端不只 Surge / Loon / QX / Egern / Stash / Clash / Shadowrocket / Sub-Store，新客户端按 AGENTS §1.2 登记。
- 提交前跑 `python3 tools/check_repo.py`，`0 error` 再提交。
- 模块必须可溯源：上游仓库 / 作者 / 许可证 / 同步版本写进模块 `README.md` 的「来源」；改写过的注明改动点。
- 模块内所有链接指向本仓库 raw：`https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/<路径>`。
