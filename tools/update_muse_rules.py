#!/usr/bin/env python3
"""采集 Muse / Meta AI 体系的域名与 IP，生成 Surge 规则集。

数据源
-----
1. 人工核心清单（CORE / EXACT / SUFFIX）——保证关键域永远在
2. 证书透明日志 crt.sh —— 自动发现子域

输出
----
Surge/Rules/Muse.list     Surge 规则（DOMAIN-SUFFIX / DOMAIN）
Surge/Rules/MuseIPs.txt   IP 参考清单（不参与分流，仅供排查）

设计取舍
--------
* 只输出域名规则。CDN 的 IP 频繁轮换，写 IP 规则会导致分流时好时坏。
* IP 单独写进 MuseIPs.txt 作参考，不生成 IP-CIDR 规则。
* crt.sh 不可用时降级为「仅核心清单」，退出码仍为 0，不阻断 CI。
* 输出稳定排序，两次运行内容无变化就不会产生提交。
"""

from __future__ import annotations

import json
import re
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------- 人工清单

# 必须始终包含的根域（用 DOMAIN-SUFFIX，覆盖所有子域）
CORE = [
    "muse.ai",
    "museai.com",
    "ecto1.ai",
    "hatch.club",
    "meta.ai",
    "meta.com",
    "atmeta.com",
    "llama.com",
    "llamameta.net",
    "metaaivm.com",
    "metaaiusercontent.com",
]

# 精确主机（登录 / 静态 / 语音等，无法靠根域后缀覆盖的）
EXACT = [
    "agent.meta.ai",
    "hatch.meta.ai",
    "api.muse.ai",
    "production.museai.com",
    "voice.museai.com",
    "auth.meta.com",
    "accountscenter.meta.com",
    "connect.facebook.net",
    "nest-static.fbcdn.net",
]

# Meta 共用整域
SUFFIX_EXTRA = [
    "fbcdn.net",
    "facebook.com",
]

# 证书透明查询目标；值为 None 表示不过滤，否则按前缀关键字过滤
CT_ROOTS: dict[str, tuple[str, ...] | None] = {
    "muse.ai": None,
    "museai.com": None,
    "ecto1.ai": None,
    "hatch.club": None,
    # meta.ai 下有大量与 Muse 无关的域，只保留相关前缀
    "meta.ai": ("hatch", "agent", "muse", "llama", "ai", "meta", "www", "dev", "developer"),
}

MAX_PER_ROOT = 80          # 每个根域最多收多少条 CT 结果
CT_TIMEOUT = 45
CT_RETRIES = 3

HOST_RE = re.compile(r"^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$")
UA = "Mozilla/5.0 (compatible; MuseRuleBot/1.0; +https://github.com/lylywayr/NetWork-Module)"


# ---------------------------------------------------------------- 采集

def crt_sh(root: str) -> list[str]:
    """从 crt.sh 拉取某个根域的子域，失败返回空列表。"""
    url = "https://crt.sh/?q=" + urllib.parse.quote(f"%.{root}") + "&output=json"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    for attempt in range(1, CT_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=CT_TIMEOUT) as resp:
                raw = resp.read().decode("utf-8", "replace")
            data = json.loads(raw)
            names: set[str] = set()
            for item in data:
                for name in str(item.get("name_value", "")).split("\n"):
                    names.add(name.strip().lower())
            return sorted(n for n in names if n)
        except Exception as exc:  # 网络/解析异常都降级
            log(f"crt.sh {root} 第 {attempt} 次失败: {exc}")
            if attempt < CT_RETRIES:
                time.sleep(3 * attempt)
    return []


def clean(host: str, roots: list[str]) -> str | None:
    """校验主机名，返回规范化结果或 None。"""
    host = host.strip().lower().lstrip("*.").rstrip(".")
    if not host or "*" in host or " " in host:
        return None
    if not HOST_RE.match(host):
        return None
    if not any(host == r or host.endswith("." + r) for r in roots):
        return None
    return host


def collect_hosts() -> tuple[list[str], list[str], list[str]]:
    """返回 (suffix_rules, domain_rules, all_hosts)。

    all_hosts 含证书透明发现的全部子域，只用于 IP 清单（不生成规则）。
    """
    discovered: set[str] = set()
    for root, prefixes in CT_ROOTS.items():
        found = crt_sh(root)
        log(f"crt.sh {root}: {len(found)} 条")
        kept = []
        for host in found:
            h = clean(host, [root])
            if not h:
                continue
            if prefixes and not any(h.split(".")[0].startswith(p) or h.startswith(p + ".") for p in prefixes):
                continue
            kept.append(h)
        kept = sorted(set(kept))[:MAX_PER_ROOT]
        discovered.update(kept)

    suffix_rules = sorted(set(CORE) | set(SUFFIX_EXTRA))

    # 已被某个 DOMAIN-SUFFIX 覆盖的主机不必单列，否则清单里全是冗余
    def covered(host: str) -> bool:
        return any(host == s or host.endswith("." + s) for s in suffix_rules)

    exact_rules = sorted(h for h in (set(EXACT) | discovered) if not covered(h))
    return suffix_rules, exact_rules, sorted(set(suffix_rules) | set(EXACT) | discovered)


def resolve(host: str) -> list[str]:
    """解析 IPv4，失败返回空列表。跳过 Surge Fake-IP 段。"""
    try:
        infos = socket.getaddrinfo(host, None, socket.AF_INET)
    except Exception:
        return []
    ips = {info[4][0] for info in infos}
    # 198.18.0.0/15 是 Surge 的 Fake-IP 段，出现在本机运行结果里，对 CI 无意义
    return sorted(ip for ip in ips if not ip.startswith(("198.18.", "198.19.")))


# ---------------------------------------------------------------- 输出

def build_rules(suffix_rules: list[str], domain_rules: list[str]) -> str:
    stamp = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M %z")
    lines = [
        "# Muse / Meta AI 体系 —— 自动生成，请勿手工编辑",
        f"# 生成时间：{stamp}",
        "# 生成脚本：tools/update_muse_rules.py",
        "# 定时任务：.github/workflows/update-muse-rules.yml（每日 03:00 UTC）",
        "#",
        f"# DOMAIN-SUFFIX {len(suffix_rules)} 条 | DOMAIN {len(domain_rules)} 条",
        "#",
        "# 说明：Muse 是 Meta 产品，登录、账号、静态资源、CDN 与 Facebook/Instagram 共用域名，",
        "#       因此包含 meta.com / fbcdn.net / facebook.com 属正常设计。",
        "# 排序要求：必须置于 AIGC.list 之前，否则 muse.ai 会被 AIGC 抢先匹配。",
        "",
        "# > 根域（含全部子域）",
    ]
    lines += [f"DOMAIN-SUFFIX,{d}" for d in suffix_rules]
    lines += ["", "# > 精确主机（人工清单 + 证书透明发现）"]
    lines += [f"DOMAIN,{d}" for d in domain_rules]
    return "\n".join(lines) + "\n"


def build_ips(hosts: list[str]) -> str:
    stamp = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M %z")
    rows: list[tuple[str, list[str]]] = []
    for host in hosts:
        ips = resolve(host)
        if ips:
            rows.append((host, ips))
    total_ips = sum(len(ips) for _, ips in rows)

    lines = [
        "# Muse / Meta AI 解析 IP —— 自动生成，仅供参考",
        f"# 生成时间：{stamp}",
        "#",
        "# 注意：本文件不参与分流。CDN 与 anycast 的 IP 会频繁变化，",
        "#       写 IP-CIDR 规则会导致分流结果不稳定，故仅作排查参考。",
        "#",
        f"# 解析成功 {len(rows)} / {len(hosts)} 个主机，共 {total_ips} 条 IP",
        "",
    ]
    for host, ips in rows:
        lines.append(f"{host}: {', '.join(ips)}")
    if not rows:
        lines += [
            "",
            "# 本次未解析到真实 IP。若在 Surge 开启的设备上运行，",
            "# 解析结果位于 198.18.0.0/15（Fake-IP 段）已被过滤，",
            "# 属正常现象；CI 环境运行会得到真实 IP。",
        ]
    return "\n".join(lines) + "\n"


def log(msg: str) -> None:
    print(f"[muse] {msg}", flush=True)


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "Surge" / "Rules"
    out_dir.mkdir(parents=True, exist_ok=True)

    suffix_rules, domain_rules, all_hosts = collect_hosts()
    log(f"根域 {len(suffix_rules)} 条，精确主机 {len(domain_rules)} 条（已去重），IP 清单覆盖 {len(all_hosts)} 个主机")

    rules_path = out_dir / "Muse.list"
    rules_path.write_text(build_rules(suffix_rules, domain_rules), encoding="utf-8")
    log(f"已写入 {rules_path}")

    ips_path = out_dir / "MuseIPs.txt"
    ips_path.write_text(build_ips(all_hosts), encoding="utf-8")
    log(f"已写入 {ips_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
