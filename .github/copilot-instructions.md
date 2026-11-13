# Copilot Instructions

本仓库是用户唯一的网络客户端模块仓库：`lylywayr/NetWork-Module`（默认分支 `main`）。
完整约定见仓库根目录的 `AGENTS.md`。

要点：

- 新增 Surge / Loon / QuantumultX / Egern / Stash / Clash / Shadowrocket / Sub-Store 的模块时，提交到对应客户端目录下的 `<前缀>-<名称>/`。
- 每个模块目录包含：模块文件（`.sgmodule` / `.plugin` / `.qx.conf` / `.yaml` / `.stoverride` / `.conf` / `.js`）、依赖脚本（如有）、`README.md`（中文）。
- 所有链接使用 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/<路径>`。
- 不要新建仓库、不要 fork、不要写上游仓库；不要修改 `Fanqie/` 下的自动同步脚本与生成文件。
