# IP 纯净度面板

## 说明
在「策略组」页面底部显示当前出口 IP 的纯净度：IPv4、归属地、ASN、线路类型（住宅·家宽 / 机房·云 / 移动网络）与风险等级。点右上角刷新按钮立即检测，或按 30 秒间隔自动更新。

## 文件
- `IPPurity.sgmodule` — 模块入口
- `ip-purity.js` — 依赖脚本（已本地化到本目录）

## 安装
- Surge：导入 [IPPurity.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-IPPurity/IPPurity.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-IPPurity/IPPurity.sgmodule
```

## 来源
- 迁出仓库：`lylywayr/surge-modules` → `IPPurity.sgmodule`

## 维护记录
- 2026-11-13：从 `surge-modules` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
