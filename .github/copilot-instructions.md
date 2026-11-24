# Copilot Instructions

本仓库是用户主要的网络客户端模块仓库：`lylywayr/NetWork-Module`（默认分支 `main`）。
完整约定见仓库根目录的 `AGENTS.md`。

要点：

- 新增 Surge / Loon / QuantumultX / Egern / Stash / Clash / Shadowrocket / Sub-Store 的模块时，提交到对应客户端目录下的 `<前缀>-<名称>/`。
- 每个模块目录包含：模块文件（`.sgmodule` / `.plugin` / `.qx.conf` / `.yaml` / `.stoverride` / `.conf` / `.js`）、依赖脚本（如有）、`README.md`（中文）。
- 新增 / 改名 / 删除模块时，必须同步更新客户端目录 `README.md` 的「当前模块」清单（格式见 `AGENTS.md` §2.1），与模块 `README.md` 在同一个提交里完成。
- 模块目录名与主文件名是永久路径：发布后不改名、不删除、不带日期和数量词；改内容只动文件内部，否则已发出的 raw 链接会 404。
- 提交前跑 `python3 tools/check_repo.py`，必须 `0 error`。
- 所有链接使用 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/<路径>`。
- 模块必须可溯源：上游仓库、原作者、许可证、同步版本写进 `README.md`「来源」；本地化脚本注明相对上游的改动。
