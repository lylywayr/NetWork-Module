#!/usr/bin/env python3
"""Synchronize merged FanQieNovel rules as Surge and Loon modules."""

from __future__ import annotations

import argparse
import hashlib
import json
import time
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "FanQieNovel-AdBlock.sgmodule"
LOON_OUTPUT = ROOT.parents[1] / "Loon" / "模块-番茄小说去广告" / "FanQieNovel-AdBlock.plugin"
SOURCES = ROOT / "sources.json"
UA_CANDIDATES = [
    ("browser", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"),
    ("loon", "Loon/3.0.0 CFNetwork/1496.0.7 Darwin/23.5.0"),
    ("surge", "Surge iOS/5.0 CFNetwork/1496.0.7 Darwin/23.5.0"),
    ("egern", "Egern/1.0 CFNetwork/1496.0.7 Darwin/23.5.0"),
]


def log(message: str) -> None:
    print(f"[信息] {message}")


def fetch(url: str, preferred: str | None) -> tuple[str, str]:
    candidates = UA_CANDIDATES
    if preferred:
        candidates = [entry for entry in UA_CANDIDATES if entry[0] == preferred] + [
            entry for entry in UA_CANDIDATES if entry[0] != preferred
        ]
    errors: list[str] = []
    for ua_name, user_agent in candidates:
        for attempt in range(1, 4):
            try:
                request = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "text/plain,*/*"})
                with urllib.request.urlopen(request, timeout=60) as response:
                    text = response.read().decode("utf-8-sig")
                if not text.strip():
                    raise RuntimeError("empty response")
                return text, ua_name
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{ua_name}#{attempt}: {exc}")
                if attempt < 3:
                    time.sleep(attempt)
    raise RuntimeError(" ; ".join(errors))


def add_unique(items: list[str], value: str) -> None:
    if value not in items:
        items.append(value)


def convert_rules(text: str) -> list[str]:
    output: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith((";", "#")):
            continue
        parts = [part.strip() for part in line.split(",")]
        if len(parts) != 3 or parts[2].lower() != "reject":
            continue
        kind, value, _ = parts
        if kind == "host":
            if value.startswith("*"):
                add_unique(output, f"DOMAIN-SUFFIX,{value.lstrip('*.')},REJECT")
            else:
                add_unique(output, f"DOMAIN,{value},REJECT")
        elif kind == "host-suffix":
            add_unique(output, f"DOMAIN-SUFFIX,{value},REJECT")
        elif kind == "ip-cidr":
            add_unique(output, f"IP-CIDR,{value},REJECT,no-resolve")
    if not output:
        raise RuntimeError("未解析出可用分流规则")
    return output


def convert_rewrites(text: str) -> tuple[list[str], list[str]]:
    rewrites: list[str] = []
    hostnames: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.lower().startswith("hostname") and "=" in line:
            for hostname in line.split("=", 1)[1].split(","):
                if hostname.strip():
                    add_unique(hostnames, hostname.strip())
        elif line.endswith(" url reject"):
            add_unique(rewrites, f"{line[: -len(' url reject')].strip()} _ reject")
    if not rewrites or not hostnames:
        raise RuntimeError("未解析出 URL 重写或 MITM 主机")
    return rewrites, hostnames


def convert_kelee_rules(text: str) -> list[str]:
    output: list[str] = []
    in_rules = False
    for raw in text.splitlines():
        line = raw.strip()
        if line == "[Rule]":
            in_rules = True
            continue
        if in_rules and line.startswith("["):
            break
        if not in_rules or not line or line.startswith("#"):
            continue
        parts = [part.strip() for part in line.split(",")]
        if len(parts) != 3 or parts[2].upper() != "REJECT":
            continue
        kind, value, _ = parts
        if kind.upper() in {"DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "IP-CIDR", "IP-CIDR6"}:
            add_unique(output, f"{kind.upper()},{value},REJECT")
    if not output:
        raise RuntimeError("未从 Kelee Loon 模块解析出可用规则")
    return output


def read_existing_sections() -> tuple[list[str], list[str], list[str]]:
    if not OUTPUT.exists():
        return [], [], []
    text = OUTPUT.read_text(encoding="utf-8-sig")
    try:
        rules = [line for line in text.split("[Rule]\n", 1)[1].split("\n[URL Rewrite]", 1)[0].splitlines() if line.strip()]
        rewrites = [line for line in text.split("[URL Rewrite]\n", 1)[1].split("\n[MITM]", 1)[0].splitlines() if line.strip()]
        hosts = text.split("hostname = %APPEND% ", 1)[1].strip().split(", ")
    except IndexError as exc:
        raise RuntimeError("现有番茄小说模块结构不完整，拒绝覆盖") from exc
    return rules, rewrites, hosts


def build(rules: list[str], rewrites: list[str], hostnames: list[str], *, platform: str) -> str:
    hostname_prefix = "hostname = %APPEND% " if platform == "Surge" else "hostname = "
    return "\n".join(
        [
            "#!name=番茄小说去广告",
            "#!desc=合并 zqzess 与 Kelee 的番茄小说去广告规则。启用后会拦截开屏、底部、章末与听书页面广告。",
            f"#!author=zqzess、可莉；{platform} 适配由 NetWork-Module 维护",
            "#!homepage=https://github.com/zqzess/rule_for_quantumultX",
            "#!category=Advertising",
            "",
            "[Rule]",
            *rules,
            "",
            "[URL Rewrite]",
            *rewrites,
            "",
            "[MITM]",
            hostname_prefix + ", ".join(hostnames),
            "",
        ]
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="同步番茄小说 Surge 与 Loon 模块。")
    parser.add_argument("--dry-run", action="store_true", help="只下载和转换，不写入文件。")
    args = parser.parse_args()
    try:
        source_data = json.loads(SOURCES.read_text(encoding="utf-8"))
        snippet, snippet_ua = fetch(source_data["snippet_url"], source_data.get("snippet_ua"))
        rewrite, rewrite_ua = fetch(source_data["rewrite_url"], source_data.get("rewrite_ua"))
        kelee, kelee_ua = fetch(source_data["kelee_url"], source_data.get("kelee_ua"))
        existing_rules, existing_rewrites, existing_hosts = read_existing_sections()
        rules = list(existing_rules)
        for rule in convert_rules(snippet):
            add_unique(rules, rule)
        for rule in convert_kelee_rules(kelee):
            add_unique(rules, rule)
        source_rewrites, source_hosts = convert_rewrites(rewrite)
        rewrites = list(existing_rewrites)
        hostnames = list(existing_hosts)
        for item in source_rewrites:
            add_unique(rewrites, item)
        for item in source_hosts:
            add_unique(hostnames, item)
        surge_module = build(rules, rewrites, hostnames, platform="Surge")
        loon_module = build(rules, rewrites, hostnames, platform="Loon")
        surge_changed = not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != surge_module
        loon_changed = not LOON_OUTPUT.exists() or LOON_OUTPUT.read_text(encoding="utf-8") != loon_module
        changed = surge_changed or loon_changed
        if args.dry_run:
            log(f"dry-run：规则 {len(rules)} 条，重写 {len(rewrites)} 条，MITM 主机 {len(hostnames)} 个，Surge 变更 {surge_changed}，Loon 变更 {loon_changed}")
            return 0
        if surge_changed:
            OUTPUT.write_text(surge_module, encoding="utf-8", newline="\n")
        if loon_changed:
            LOON_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
            LOON_OUTPUT.write_text(loon_module, encoding="utf-8", newline="\n")
        source_data.update(
            {
                "module_sha256": hashlib.sha256(surge_module.encode("utf-8")).hexdigest(),
                "loon_module": str(LOON_OUTPUT.relative_to(ROOT.parents[1])).replace("\\", "/"),
                "loon_module_sha256": hashlib.sha256(loon_module.encode("utf-8")).hexdigest(),
                "snippet_sha256": hashlib.sha256(snippet.encode("utf-8")).hexdigest(),
                "snippet_ua": snippet_ua,
                "rewrite_sha256": hashlib.sha256(rewrite.encode("utf-8")).hexdigest(),
                "rewrite_ua": rewrite_ua,
                "kelee_sha256": hashlib.sha256(kelee.encode("utf-8")).hexdigest(),
                "kelee_ua": kelee_ua,
            }
        )
        old_source_data = json.loads(SOURCES.read_text(encoding="utf-8"))
        if source_data != old_source_data:
            SOURCES.write_text(json.dumps(source_data, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
        log(f"番茄小说模块已同步：规则 {len(rules)} 条，重写 {len(rewrites)} 条，MITM 主机 {len(hostnames)} 个，内容变更 {changed}")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"[错误] {exc}", file=__import__("sys").stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
