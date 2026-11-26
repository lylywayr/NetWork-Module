# 规则清单（可选）

## 说明

不属于任何模块的独立规则清单，供 Surge 配置里按需引用，不随模块自动加载。

- `Muse.list`：Meta Muse（`com.facebook.hatch`）与 Meta 体系依赖域名，用于把 Muse 流量送进指定策略组。
- `ZhipuExtra.list`：智谱 AI 补充域名，实测走国内直连更稳（海外节点 Read stream EOF）。

## 使用

在 `[Rule]` 里按需引用，策略字段换成自己的组名：

```ini
RULE-SET,https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/Rules/Muse.list,智能助理,no-resolve
RULE-SET,https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/Rules/ZhipuExtra.list,国内直连,no-resolve
```

首次加载后如未生效，执行一次 `external-resource update` 强制拉取。

## 文件

- `Muse.list`
- `ZhipuExtra.list`
- `iOS/`：iOS 可用版规则清单镜像（剔除 macOS 专有的 `PROCESS-NAME` 规则），见 [iOS/README.md](iOS/README.md)

## 维护记录

- 2026-11-24：补 README，说明用途与引用方式。
- 2026-11-27：新增 `iOS/` 子目录，15 份常用清单剔除 32 条 macOS 专有规则，GitHub Actions 每日同步。
