# 屏蔽系统更新精简版

## 说明
仅拦截 iOS 系统更新（OTA）检测与下载域名。纯连接层拦截，无需 MITM，与 tvOS 描述文件配合作为双重防护。随时可开关。

## 文件
- `NoOTA_Lite.sgmodule` — 模块入口

## 安装
- Surge：导入 [NoOTA_Lite.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-NoOTA_Lite/NoOTA_Lite.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-NoOTA_Lite/NoOTA_Lite.sgmodule
```

## 来源
- 迁出仓库：`lylywayr/Surge` → `Module/Spec/NoOTA_Lite/NoOTA_Lite.sgmodule`

## 维护记录
- 2026-11-13：从 `Surge` 迁入并按 `AGENTS.md` 整理（依赖脚本本地化、链接改写、补中文 README）。
