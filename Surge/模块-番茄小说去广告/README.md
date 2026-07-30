# 番茄小说去广告

合并 zqzess 的 Quantumult X 规则与 Kelee 的 Loon 规则，适配为 Surge 模块。

安装链接：

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-%E7%95%AA%E8%8C%84%E5%B0%8F%E8%AF%B4%E5%8E%BB%E5%B9%BF%E5%91%8A/FanQieNovel-AdBlock.sgmodule
```

模块包含广告域名拒绝、章末广告 URL 重写和所需 MITM 主机。每日同步会拉取以下来源，仅在上游内容变化时更新模块。同步采用稳定并集：新增内容自动加入，已发布规则、重写和 MITM 主机不会因上游删除而自动移除。

- https://raw.githubusercontent.com/zqzess/rule_for_quantumultX/master/QuantumultX/snippet/FanQieNovel.snippet
- https://raw.githubusercontent.com/zqzess/rule_for_quantumultX/refs/heads/master/QuantumultX/rewrite/FanQieNovel.qxrewrite
- https://kelee.one/Tool/Loon/Lpx/DragonRead_remove_ads.lpx（使用 Loon UA）
