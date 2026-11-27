#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把上游规则清单镜像成「iOS 可用版」：剔除 macOS 专属规则类型，其余条目原样保留。

Surge iOS 不支持 PROCESS-NAME（无法看到进程），这类规则在 iPhone 上永远不会命中，
属于死条目。本脚本把它们去掉，生成可直接被 iOS 端引用的清单，避免引用了「看着有、
实际不生效」的规则。

用法：
    python3 tools/sync_ios_rules.py            # 同步并写入 Surge/Rules/iOS/
    python3 tools/sync_ios_rules.py --check    # 只报告差异，不写文件
"""
import io
import os
import sys
import time
import urllib.request

RAW = "https://raw.githubusercontent.com/{repo}/{branch}/{path}"

# 清单名 -> 上游地址
SOURCES = {
    # Rabbit-Spec/Surge（配置上游）
    "AIGC":        RAW.format(repo="Rabbit-Spec/Surge", branch="Master", path="Rules/AIGC.list"),
    "Apple":       RAW.format(repo="Rabbit-Spec/Surge", branch="Master", path="Rules/Apple.list"),
    # Telegram 用黑matrix7：Rabbit 那份只有 14 条 IP 段、零域名，iOS 上 telegram.org 这类域名走不到组里
    "Telegram":    RAW.format(repo="blackmatrix7/ios_rule_script", branch="master",
                              path="rule/Surge/Telegram/Telegram.list"),
    "Game":        RAW.format(repo="Rabbit-Spec/Surge", branch="Master", path="Rules/Game.list"),
    "YouTube":     RAW.format(repo="Rabbit-Spec/Surge", branch="Master", path="Rules/YouTube.list"),
    "Netflix":     RAW.format(repo="Rabbit-Spec/Surge", branch="Master", path="Rules/Netflix.list"),
    "BiliBili":    RAW.format(repo="Rabbit-Spec/Surge", branch="Master", path="Rules/BiliBili.list"),
    "ChinaMedia":  RAW.format(repo="Rabbit-Spec/Surge", branch="Master", path="Rules/ChinaMedia.list"),
    "GlobalMedia": RAW.format(repo="Rabbit-Spec/Surge", branch="Master", path="Rules/GlobalMedia.list"),
    "Google":      RAW.format(repo="Rabbit-Spec/Surge", branch="Master", path="Rules/Google.list"),
    "Proxy":       RAW.format(repo="Rabbit-Spec/Surge", branch="Master", path="Rules/Proxy.list"),
    # blackmatrix7/ios_rule_script（Surge 原生清单）
    "GitHub":      RAW.format(repo="blackmatrix7/ios_rule_script", branch="master",
                              path="rule/Surge/GitHub/GitHub.list"),
    "Microsoft":   RAW.format(repo="blackmatrix7/ios_rule_script", branch="master",
                              path="rule/Surge/Microsoft/Microsoft.list"),
    "TikTok":      RAW.format(repo="blackmatrix7/ios_rule_script", branch="master",
                              path="rule/Surge/TikTok/TikTok.list"),
    "Gemini":      RAW.format(repo="blackmatrix7/ios_rule_script", branch="master",
                              path="rule/Surge/Gemini/Gemini.list"),
    # 秋风广告规则
    "AWAvenueAds": RAW.format(repo="TG-Twilight/AWAvenue-Ads-Rule", branch="main",
                              path="Filters/AWAvenue-Ads-Rule-Surge-RULE-SET.list"),
}

# iOS 端不支持的规则类型（macOS 专有）
DROP_TYPES = ("PROCESS-NAME",)

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "Surge", "Rules", "iOS")


def fetch(url, retries=3):
    last = None
    for _ in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "sync-ios-rules/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2)
    raise SystemExit(f"下载失败 {url}: {last}")


def clean(name, url, text):
    kept, dropped = [], 0
    for line in text.split("\n"):
        s = line.strip()
        if not s or s.startswith("#") or s.startswith("//"):
            continue
        if s.split(",")[0].strip() in DROP_TYPES:
            dropped += 1
            continue
        kept.append(s)
    header = [
        f"# NAME: {name}（iOS 可用版）",
        f"# SOURCE: {url}",
        f"# SYNCED: {time.strftime('%Y-%m-%d %H:%M:%S %z')}",
        "# NOTE: 已移除 macOS 专属规则类型（PROCESS-NAME），其余条目与上游一致。",
        f"# TOTAL: {len(kept)}（上游剔除 {dropped} 条）",
        "",
    ]
    return "\n".join(header + kept) + "\n", dropped


def main():
    check_only = "--check" in sys.argv
    os.makedirs(OUT_DIR, exist_ok=True)
    changed = 0
    for name, url in SOURCES.items():
        body, dropped = clean(name, url, fetch(url))
        path = os.path.join(OUT_DIR, f"{name}.list")
        old = io.open(path, encoding="utf-8").read() if os.path.exists(path) else ""
        # 忽略 SYNCED 行的差异，避免每天无意义提交
        same = old.split("\n", 4)[4:] == body.split("\n", 4)[4:]
        if not same:
            changed += 1
            print(f"更新 {name:12s} 剔除 {dropped:3d} 条 macOS 专属")
            if not check_only:
                io.open(path, "w", encoding="utf-8").write(body)
        else:
            print(f"无变化 {name:12s} 剔除 {dropped:3d} 条")
    print(f"\n变更 {changed} 个文件" + ("（--check，未写入）" if check_only else ""))


if __name__ == "__main__":
    main()
