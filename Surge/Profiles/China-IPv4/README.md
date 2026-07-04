# 中国大陆 IPv4 分流配置（Surge）

适用于中国大陆网络环境的 Surge 托管配置。

## 托管地址

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/Profiles/China-IPv4/China-IPv4-Routing.conf
```

## 使用说明

- 配置保留 MITM、内置证书、脚本、策略组与原有分流逻辑。
- `我的节点`、`CF优选`、`自建节点` 三个策略组的订阅地址已替换为：`填入你的订阅`。
- 请在 Surge 本地编辑这三个策略组，填入自己的订阅地址。
- `Rules` 目录用于存放配置引用的规则集；托管配置会使用本仓库的 Raw 地址。

## 目录结构

```text
Surge/Profiles/China-IPv4/
├── China-IPv4-Routing.conf
├── README.md
└── Rules/
```
