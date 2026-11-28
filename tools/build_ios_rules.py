#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""规则构建：以公开权威源（geosite / geoip）为主，聚合源为辅，合并在本仓库内完成。

优先级
1. v2fly/domain-list-community 的 geosite 分类（社区维护的权威域名库，每日更新）
2. Loyalsoldier/v2ray-rules-dat、blackmatrix7、Rabbit-Spec 等聚合源（补 geosite 缺的 IP 段与冷门域名）
3. 剔除 macOS 专有 PROCESS-NAME，做完全去重与后缀收敛
4. geoip：v2fly/geoip + chnroutes2 合并出中国 IP 段

用法：python3 tools/build_ios_rules.py [--check]
"""
import io
import os
import sys
import time
import urllib.request

RAW = "https://raw.githubusercontent.com/{repo}/{branch}/{path}"
V2FLY = "v2fly/domain-list-community"
RABBIT = "Rabbit-Spec/Surge"
BM7 = "blackmatrix7/ios_rule_script"

# 类目 -> 源列表：("geosite", 分类名) / ("rule", repo, branch, path)
SOURCES = {
    "AIGC":        [("geosite", "openai"), ("geosite", "anthropic"), ("geosite", "google-gemini"),
                    ("rule", RABBIT, "Master", "Rules/AIGC.list")],
    "Apple":       [("geosite", "apple"), ("rule", RABBIT, "Master", "Rules/Apple.list")],
    "Telegram":    [("geosite", "telegram"), ("rule", BM7, "master", "rule/Surge/Telegram/Telegram.list")],
    "YouTube":     [("geosite", "youtube"), ("rule", RABBIT, "Master", "Rules/YouTube.list")],
    "Netflix":     [("geosite", "netflix"), ("rule", RABBIT, "Master", "Rules/Netflix.list")],
    "BiliBili":    [("geosite", "bilibili"), ("rule", RABBIT, "Master", "Rules/BiliBili.list")],
    "TikTok":      [("geosite", "tiktok"), ("rule", BM7, "master", "rule/Surge/TikTok/TikTok.list")],
    "Google":      [("geosite", "google"), ("rule", RABBIT, "Master", "Rules/Google.list")],
    "Gemini":      [("geosite", "google-gemini"), ("rule", BM7, "master", "rule/Surge/Gemini/Gemini.list")],
    "GitHub":      [("geosite", "github"), ("rule", BM7, "master", "rule/Surge/GitHub/GitHub.list")],
    "Microsoft":   [("geosite", "microsoft"), ("rule", BM7, "master", "rule/Surge/Microsoft/Microsoft.list")],
    "Game":        [("geosite", "steam"), ("geosite", "epicgames"), ("geosite", "blizzard"),
                    ("geosite", "nintendo"), ("geosite", "playstation"), ("geosite", "riot"),
                    ("rule", RABBIT, "Master", "Rules/Game.list")],
    "ChinaMedia":  [("geosite", "category-media-cn"), ("rule", RABBIT, "Master", "Rules/ChinaMedia.list")],
    "GlobalMedia": [("geosite", "disney"), ("geosite", "hbo"), ("geosite", "primevideo"),
                    ("rule", RABBIT, "Master", "Rules/GlobalMedia.list")],
    "Proxy":       [("geosite", "gfw"), ("rule", RABBIT, "Master", "Rules/Proxy.list")],
    "AWAvenueAds": [("rule", "TG-Twilight/AWAvenue-Ads-Rule", "main",
                     "Filters/AWAvenue-Ads-Rule-Surge-RULE-SET.list")],
}

GEOIP_SOURCES = [
    "https://raw.githubusercontent.com/v2fly/geoip/release/text/cn.txt",
    "https://raw.githubusercontent.com/misakaio/chnroutes2/master/chnroutes.txt",
    "https://raw.githubusercontent.com/17mon/china_ip_list/master/china_ip_list.txt",
]

DROP_TYPES = {"PROCESS-NAME"}
MIN_RULES = 10

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "Surge", "Rules", "iOS")


def url_of(kind, *args):
    if kind == "geosite":
        return RAW.format(repo=V2FLY, branch="master", path=f"data/{args[0]}")
    repo, branch, path = args
    return RAW.format(repo=repo, branch=branch, path=path)


def fetch(url, retries=4):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "build-rules/3.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read().decode("utf-8", "replace")
            time.sleep(1.0)
            return data
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 ** i)
    print(f"    ! 下载失败 {url}: {last}")
    return None


def parse_geosite(text):
    """v2ray domain-list 格式：domain:/full:/keyword:/regexp:/include:
    返回 (规则, include 列表)。"""
    rules, includes = [], []
    for line in text.split("\n"):
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if s.startswith("domain:"):
            rules.append(("DOMAIN-SUFFIX", s[7:].lower()))
        elif s.startswith("full:"):
            rules.append(("DOMAIN", s[5:].lower()))
        elif s.startswith("keyword:"):
            rules.append(("DOMAIN-KEYWORD", s[8:].lower()))
        elif s.startswith("include:"):
            includes.append(s[8:].strip())
        # regexp 跳过：Surge 不支持正则域名
    return rules, includes


def parse_surge(text):
    rules = []
    for line in text.split("\n"):
        s = line.strip()
        if not s or s.startswith("#") or s.startswith("//"):
            continue
        parts = [p.strip() for p in s.split(",")]
        t = parts[0].upper()
        if t in DROP_TYPES or len(parts) < 2:
            continue
        rules.append((t, parts[1].lower()))
    return rules


def dedupe(rules):
    seen, uniq = set(), []
    for t, v in rules:
        if (t, v) in seen:
            continue
        seen.add((t, v))
        uniq.append((t, v))
    suffixes = {v for t, v in uniq if t == "DOMAIN-SUFFIX"}
    out = []
    for t, v in uniq:
        p = v.split(".")
        covered = any(".".join(p[i:]) in suffixes for i in range(1, len(p)))
        if t == "DOMAIN" and covered:
            continue
        if t == "DOMAIN-SUFFIX" and covered:
            continue
        out.append((t, v))
    return out


def build_category(name, sources):
    merged, contrib = [], {}
    for src in sources:
        u = url_of(*src)
        text = fetch(u)
        if not text:
            continue
        if src[0] == "geosite":
            rules, includes = parse_geosite(text)
            # 展开 include（最多两层），补回分类里引用到的其它分类
            seen_inc = set()
            queue = [(i, 1) for i in includes]
            while queue:
                inc, depth = queue.pop(0)
                if inc in seen_inc or depth > 2:
                    continue
                seen_inc.add(inc)
                sub = fetch(url_of("geosite", inc))
                if not sub:
                    continue
                r2, inc2 = parse_geosite(sub)
                rules.extend(r2)
                queue += [(i, depth + 1) for i in inc2]
        else:
            rules = parse_surge(text)
        if len(rules) < 5:
            print(f"    ! {src[0]} {src[-1]} 仅 {len(rules)} 条，跳过")
            continue
        contrib[f"{src[0]}:{src[-1] if src[0] != 'geosite' else src[1]}"] = len(rules)
        merged.extend(rules)
    final = dedupe(merged)
    if len(final) < MIN_RULES:
        return None, contrib, False
    # 有两个以上来源成功时，合并结果可信，不再拿旧文件比大小
    return final, contrib, len(contrib) >= 2


def write(name, final, contrib, urls, check_only, trust=False):
    body = [
        f"# NAME: {name}（geosite 优先 · 多源合并 · iOS 可用版）",
        f"# SOURCES: {' | '.join(urls)}",
        f"# CONTRIB: {' | '.join(f'{k}={v}' for k, v in contrib.items())}",
        f"# SYNCED: {time.strftime('%Y-%m-%d %H:%M:%S %z')}",
        "# NOTE: 已剔除 PROCESS-NAME，做完全去重与后缀收敛；regexp/include 条目跳过。",
        f"# TOTAL: {len(final)}",
        "",
    ]
    text = "\n".join(body + [f"{t},{v}" for t, v in final]) + "\n"
    path = os.path.join(OUT_DIR, f"{name}.list")
    old = io.open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    old_n = sum(1 for l in old.split("\n") if l and not l.startswith("#"))
    if (not trust) and old_n and len(final) < old_n * 0.5:
        print(f"    ! {name} 新结果 {len(final)} 条不足旧文件 {old_n} 条的一半，保留旧文件")
        return 0
    if old.split("\n", 6)[6:] == text.split("\n", 6)[6:]:
        print(f"无变化 {name:12s} {len(final):5d} 条")
        return 0
    print(f"更新   {name:12s} {len(final):5d} 条  {contrib}")
    if not check_only:
        io.open(path, "w", encoding="utf-8").write(text)
    return 1


def build_geoip(check_only):
    cidrs = []
    for u in GEOIP_SOURCES:
        text = fetch(u)
        if not text:
            continue
        n = 0
        for line in text.split("\n"):
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            cidr = s.split(",")[0] if "," in s else s
            if "/" in cidr and ":" not in cidr:
                cidrs.append(cidr)
                n += 1
        print(f"    geoip {u.split('/')[3]}: {n} 条")
    import ipaddress
    nets = []
    for c in set(cidrs):
        try:
            nets.append(ipaddress.ip_network(c, strict=False))
        except ValueError:
            pass
    # 合并相邻网段、去掉被包含的网段：规则更少，覆盖不变
    cidrs = [str(n) for n in ipaddress.collapse_addresses(nets)]
    if len(cidrs) < 1000:
        print("    ! 中国 IP 段不足，保留旧文件")
        return 0
    return write("ChinaCIDR", [("IP-CIDR", c) for c in cidrs],
                 {"geoip": len(cidrs)}, GEOIP_SOURCES, check_only)




CHINA_DOMAIN_SOURCES = [
    "https://raw.githubusercontent.com/Loyalsoldier/surge-rules/release/direct.txt",
    "https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Rules/China.list",
    "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/ChinaMax/ChinaMax.list",
]


def build_china_domains(check_only):
    """国内直连域名集（DOMAIN-SET 格式，一行一个域名）。"""
    doms = []
    for u in CHINA_DOMAIN_SOURCES:
        text = fetch(u)
        if not text:
            continue
        n = 0
        for line in text.split("\n"):
            s0 = line.strip()
            if not s0 or s0.startswith(("#", "//")):
                continue
            if s0.startswith("."):
                d = s0[1:].lower()
            else:
                parts = [x.strip() for x in s0.split(",")]
                if len(parts) >= 2 and parts[0].upper() in ("DOMAIN", "DOMAIN-SUFFIX"):
                    d = parts[1].lower()
                elif "," not in s0:
                    d = s0.lower()
                else:
                    continue
            if d and "." in d:
                doms.append(d); n += 1
        print(f"    china-domains {u.split('/')[4]}: {n} 条")

    uniq = sorted(set(doms))
    keep = []
    sset = set(uniq)
    for d in uniq:
        p2 = d.split(".")
        if any(".".join(p2[i:]) in sset for i in range(1, len(p2))):
            continue
        keep.append(d)
    if len(keep) < 50000:
        print(f"    ! 国内域名仅 {len(keep)} 条，保留旧文件")
        return 0
    body = ["# NAME: ChinaDomains（国内直连域名集 · DOMAIN-SET 格式）",
            "# SOURCES: " + " | ".join(CHINA_DOMAIN_SOURCES),
            f"# SYNCED: {time.strftime('%Y-%m-%d %H:%M:%S %z')}",
            f"# TOTAL: {len(keep)}", ""]
    text = "\n".join(body + keep) + "\n"
    path = os.path.join(OUT_DIR, "ChinaDomains.dset")
    old = io.open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    if old.split("\n", 4)[4:] == text.split("\n", 4)[4:]:
        print(f"无变化 ChinaDomains  {len(keep):6d} 条")
        return 0
    print(f"更新   ChinaDomains  {len(keep):6d} 条")
    if not check_only:
        io.open(path, "w", encoding="utf-8").write(text)
    return 1


def main():
    check_only = "--check" in sys.argv
    os.makedirs(OUT_DIR, exist_ok=True)
    changed = 0
    for name, sources in SOURCES.items():
        final, contrib, trust = build_category(name, sources)
        if final is None:
            print(f"    ! {name} 合并结果过少，保留旧文件")
            continue
        changed += write(name, final, contrib, [url_of(*s) for s in sources], check_only, trust)
    changed += build_geoip(check_only)
    changed += build_china_domains(check_only)
    print(f"\n变更 {changed} 个文件" + ("（--check，未写入）" if check_only else ""))


if __name__ == "__main__":
    main()
