#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 Game 清单按「解析落地在中国还是境外」拆成两份：
   GameCN.list   -> 直连
   GameIntl.list -> 游戏平台
解析走 dns.google（走代理，避开本地 Fake-IP），归属用 ChinaCIDR 判定。
"""
import io, json, ipaddress, concurrent.futures, urllib.request, collections

SRC = "/var/minis/workspace/media/sets/Game.list"
CIDR = "/var/minis/workspace/media/sets/ChinaCIDR.list"
OUT_CN = "/var/minis/workspace/nm/Surge/Rules/iOS/GameCN.list"
OUT_INTL = "/var/minis/workspace/nm/Surge/Rules/iOS/GameIntl.list"

def load_rules(p):
    rows = []
    for l in io.open(p, encoding="utf-8"):
        l = l.strip()
        if not l or l.startswith("#"):
            continue
        t, v = l.split(",")[0], l.split(",")[1].strip()
        rows.append((t, v.lower()))
    return rows

def load_cn():
    nets = []
    for l in io.open(CIDR, encoding="utf-8"):
        l = l.strip()
        if l.startswith(("IP-CIDR,", "IP-CIDR6,")):
            try:
                nets.append(ipaddress.ip_network(l.split(",")[1], strict=False))
            except ValueError:
                pass
    return nets

CN = load_cn()
print("中国 IP 段:", len(CN))

def is_cn(ip):
    try:
        a = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return any(a in n for n in CN if n.version == a.version)

_n=[0]
def resolve(host):
    url = f"https://doh.pub/dns-query?name={host}&type=A" if _n[0]%4 else f"https://dns.alidns.com/resolve?name={host}&type=A"
    _n[0]+=1
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={"accept": "application/dns-json"})
            with urllib.request.urlopen(req, timeout=12) as r:
                d = json.load(r)
            return [a["data"] for a in d.get("Answer", []) if a.get("type") == 1]
        except Exception:
            continue
    return []

rows = load_rules(SRC)
hosts = [v for _, v in rows]
print("清单条目:", len(rows))

res = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
    for h, ips in zip(hosts, ex.map(resolve, hosts)):
        res[h] = ips

cn_rows, intl_rows, unknown = [], [], []
for t, h in rows:
    ips = res.get(h, [])
    if not ips:
        unknown.append((t, h)); continue
    cn = sum(1 for ip in ips if is_cn(ip))
    (cn_rows if cn * 2 >= len(ips) else intl_rows).append((t, h))

print(f"中国落地 {len(cn_rows)} / 境外 {len(intl_rows)} / 解析失败 {len(unknown)}")

def write(path, name, rows_, note):
    body = ["# NAME: Game %s（iOS 可用版，按落地归属拆分）" % name,
            "# SOURCE: Rabbit-Spec/Surge Rules/Game.list（按 ChinaCIDR 判定拆分）",
            "# NOTE: %s" % note,
            "# TOTAL: %d" % len(rows_), ""]
    body += [f"{t},{h}" for t, h in rows_]
    io.open(path, "w", encoding="utf-8").write("\n".join(body) + "\n")

write(OUT_CN, "CN", cn_rows, "解析落地在中国大陆 → 直连")
write(OUT_INTL, "Intl", intl_rows, "解析落地在境外 → 游戏平台")

print("中国样例:", ", ".join(h for _, h in cn_rows[:8]))
print("境外样例:", ", ".join(h for _, h in intl_rows[:8]))
print("解析失败样例:", ", ".join(h for _, h in unknown[:8]))
io.open("/var/minis/workspace/game_unknown.txt", "w").write("\n".join(h for _, h in unknown))
