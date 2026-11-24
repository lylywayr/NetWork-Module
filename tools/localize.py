#!/usr/bin/env python3
"""把模块里的外部订阅链接本地化。

用法：
    python3 tools/localize.py                 # 只出计划，不下载
    python3 tools/localize.py --probe         # 计划 + HEAD 探测（状态、大小）
    python3 tools/localize.py --write         # 执行：下载、改名、改写 script-path、写 SOURCE.md
    python3 tools/localize.py --check         # 对照 上游/SOURCE.md 校验本地文件 sha256

规则：
- 只处理模块文件（.sgmodule/.plugin/.yaml/.stoverride/.conf/.qx.conf），不碰 README。
- 跳过本仓 raw、script.hub 动态转换、图片。
- 文件名默认沿用上游原名；同目录重名时加 `<host>-` 前缀。
- 本地化后写 `上游/SOURCE.md`，记录 URL、本地文件、sha256、大小、抓取日期。
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTS = (".sgmodule", ".plugin", ".yaml", ".stoverride", ".conf", ".qx.conf")
SKIP_DIRS = {".git", "上游"}
DYNAMIC = ("script.hub",)
IMG = re.compile(r"\.(png|jpg|jpeg|gif|webp|svg)(\?|$)", re.I)
URL_RE = re.compile(r"https?://[^\s,\"'\)\]\}]+")

def git_owner():
    url = subprocess.check_output(["git", "-C", ROOT, "remote", "get-url", "origin"], text=True).strip()
    m = re.search(r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?$", url)
    return m.group(1), m.group(2)

OWNER, REPO = git_owner()
BRANCH = "main"
RAW = f"https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/"
# 脚本引用：script-path= / script_url: / scriptPath=
ASSIGN = re.compile(
    r"(?:script-path|scriptPath|script_url)\s*[=:]\s*\"?((?:https?:)?//[^\s,\"']+)"
)
# 规则引用：RULE-SET,<url>
RULESET = re.compile(r"^\s*(?:RULE-SET|rule-set)\s*[,=:]\s*((?:https?:)?//[^\s,]+)", re.M)


def module_files():
    out = []
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            if fn.endswith(EXTS):
                p = os.path.join(dp, fn)
                if "/上游/" in p.replace(os.sep, "/"):
                    continue
                out.append(p)
    return sorted(out)

def external_urls(text):
    urls = []
    lines = []
    for line in text.splitlines():
        st = line.lstrip()
        if st.startswith(("#", ";", "//")):
            continue
        lines.append(line)
    body = "\n".join(lines)
    candidates = ASSIGN.findall(body) + RULESET.findall(body)
    for u in candidates:
        if u.startswith("//"):
            u = "https:" + u
        if not u.startswith(("http://", "https://")):
            continue
        if "raw.githubusercontent.com" in u and f"/{OWNER}/{REPO}/" in u:
            continue
        if "NetWork-Module" in u:
            continue
        if any(h in u for h in DYNAMIC):
            continue
        if IMG.search(u):
            continue
        urls.append(u)
    return urls

def target_name(url, used):
    path = urllib.parse.urlsplit(url).path
    base = os.path.basename(urllib.parse.unquote(path)) or "script.js"
    base = re.sub(r"[^\w.\-\u4e00-\u9fa5]", "_", base)
    name = base
    if name in used:
        host = urllib.parse.urlsplit(url).netloc.split(".")[0]
        name = f"{host}-{base}"
    i = 2
    while name in used:
        stem, dot, ext = name.rpartition(".")
        name = f"{stem}-{i}.{dot}{ext}" if dot else f"{name}-{i}"
        i += 1
    used.add(name)
    return name

def plan():
    items = []
    for mf in module_files():
        text = open(mf, encoding="utf-8", errors="replace").read()
        urls = external_urls(text)
        if not urls:
            continue
        used = {f for f in os.listdir(os.path.dirname(mf))}
        for u in dict.fromkeys(urls):
            items.append({
                "module_file": os.path.relpath(mf, ROOT),
                "module_dir": os.path.relpath(os.path.dirname(mf), ROOT),
                "url": u,
                "local_name": target_name(u, used),
            })
    return items

def probe(items):
    import concurrent.futures as cf
    def head(it):
        req = urllib.request.Request(it["url"], method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                it["status"] = r.status
                it["size"] = int(r.headers.get("Content-Length") or 0)
        except Exception as e:
            it["status"] = getattr(e, "code", "ERR")
            it["size"] = 0
        return it
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(head, items))
    return items

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()

def write(items):
    by_module = {}
    for it in items:
        by_module.setdefault(it["module_dir"], []).append(it)
    for mdir, its in by_module.items():
        up = os.path.join(ROOT, mdir, "上游")
        os.makedirs(up, exist_ok=True)
        rows = []
        for it in its:
            name = it["local_name"]
            path = os.path.join(ROOT, mdir, name)
            data = fetch(it["url"])
            if not path.endswith(".js") and b"\x00" in data[:1024]:
                print(f"SKIP 二进制 {it['url']}")
                continue
            with open(path, "wb") as fh:
                fh.write(data)
            sha = hashlib.sha256(data).hexdigest()
            rows.append((it["url"], name, sha, len(data)))
            print(f"GET  {mdir}/{name}  {len(data)}B")
        # 改写模块文件
        for mf in {it["module_file"] for it in its}:
            p = os.path.join(ROOT, mf)
            text = open(p, encoding="utf-8", errors="replace").read()
            for it in its:
                local = RAW + urllib.parse.quote(f"{mdir}/{it['local_name']}", safe="/")
                text = text.replace(it["url"], local)
            open(p, "w", encoding="utf-8").write(text)
        # SOURCE.md
        src = os.path.join(up, "SOURCE.md")
        new = not os.path.exists(src)
        lines = [] if new else [""]
        if new:
            lines = ["# 上游来源\n", "| 上游文件 | 本地文件 | sha256 | 大小 |\n| --- | --- | --- | --- |"]
        for url, name, sha, size in rows:
            lines.append(f"| {url} | `{name}` | `{sha}` | {size} B |")
        with open(src, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")
        print(f"SRC  {mdir}/上游/SOURCE.md")

def check():
    bad = 0
    for mf in module_files():
        up = os.path.join(os.path.dirname(mf), "上游", "SOURCE.md")
        if not os.path.exists(up):
            continue
        text = open(up, encoding="utf-8").read()
        for url, name, sha in re.findall(r"\| (https?://[^ ]+) \| `([^`]+)` \| `([0-9a-f]{64})`", text):
            p = os.path.join(os.path.dirname(mf), name)
            if not os.path.exists(p):
                print(f"MISS {os.path.relpath(p, ROOT)}")
                bad += 1
                continue
            got = hashlib.sha256(open(p, "rb").read()).hexdigest()
            if got != sha:
                print(f"DIFF {os.path.relpath(p, ROOT)}（本地被改过或上游已更新）")
                bad += 1
    print(f"校验完成：{bad} 个不一致")
    return 1 if bad else 0

def main():
    items = plan()
    if "--write" in sys.argv:
        write(items)
        return 0
    if "--probe" in sys.argv:
        items = probe(items)
    if "--check" in sys.argv:
        return check()
    total = len(items)
    mods = len({i["module_dir"] for i in items})
    print(f"待本地化：{mods} 个模块 / {total} 个外链文件")
    if "--probe" in sys.argv:
        ok = [i for i in items if i.get("status") == 200]
        print(f"探测成功 {len(ok)}，失败 {total - len(ok)}，合计 {sum(i.get('size',0) for i in ok)/1024/1024:.1f} MB")
        for i in items:
            if i.get("status") != 200:
                print("  FAIL", i["status"], i["url"])
    for it in items[:20]:
        print(f"  {it['module_dir']}: {os.path.basename(it['url'])[:60]} -> {it['local_name']}")
    if total > 20:
        print(f"  ... 其余 {total-20} 条")
    json.dump(items, open("/tmp/localize-plan.json", "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    sys.exit(main())
