# 网络诊断雷达

## 说明

一个小组件同时看出口 IP、延迟、UDP/QUIC、流媒体与 AI 可用性。可指定全局策略组，也可给流媒体、
AI 单独指定策略组；支持对 IP 打码。

## 文件

- `网络诊断雷达.yaml`（Egern 模块入口）
- `网络诊断雷达.js`（组件脚本）

## 安装

- Egern：导入 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Egern/%E7%BD%91%E7%BB%9C%E8%AF%8A%E6%96%AD%E9%9B%B7%E8%BE%BE/%E7%BD%91%E7%BB%9C%E8%AF%8A%E6%96%AD%E9%9B%B7%E8%BE%BE.yaml`

## 参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `POLICY` | 空 | 全局策略组，优先级最高，设置后所有检测统一走它 |
| `LMT` | 空 | 流媒体检测策略组，`POLICY` 为空时生效 |
| `AI` | 空 | AI 检测策略组，`POLICY` 为空时生效 |
| `YS` | `0` | `1` 对 IPv4 打码（`123.123.*.*`） |
| `XY` | 空 | 手动指定协议（VLESS / Trojan / HY2 / AnyTLS），留空自动识别 |

## 来源

- 脚本与组件来自本机维护版本，未引用第三方 raw。
- 策略优先级：`POLICY` ＞ `LMT` / `AI` ＞ 单服务内置候选策略名 ＞ 不指定。

## 维护记录

- 2026-11-24：补模块入口 yaml 与 README（此前目录里只有脚本）。
