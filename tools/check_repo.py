#!/usr/bin/env python3
"""仓库自检：先跑这个，再提交。

检查项：
1. 每个客户端目录的 README「当前模块」清单与真实子目录一一对应（用 `- `目录名`` 格式）
2. 每个模块目录都有 README.md
3. 每个模块目录都有该客户端的模块文件
4. .sgmodule 顶部有 #!name / #!desc
5. 模块里引用的本仓 raw 地址都真实存在（忽略 ?v= 查询串）
6. MITM hostname 行使用 %APPEND% / %INSERT%

用法：
    python3 tools/check_repo.py            # 全仓
    python3 tools/check_repo.py Surge      # 只查一个客户端
退出码 0 = 通过（可有 warning），1 = 有 error。
"""
import os
import re
import subprocess
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 客户端目录 -> 允许的模块文件后缀
CLIENTS = {
    "Surge": (".sgmodule",),
    "Loon": (".plugin",),
    "QuantumultX": (".qx.conf",),
    "Egern": (".yaml", ".module"),
    "Stash": (".stoverride",),
    "Shadowrocket": (".conf", ".yaml"),
    "Clash": (".yaml", ".conf"),
    "Sub-Store": (".js",),
}

LIST_ITEM = re.compile(r"^- `([^`]+)`\s*$")
RAW_REF = re.compile(
    r"https://raw\.githubusercontent\.com/([^/\s]+)/NetWork-Module/([^/\s]+)/([^\s,\"')\]]+)"
)

# 客户端目录下不按模块规范检查的资源目录
RESOURCE_DIRS = {("Surge", "Rules")}

errors = []
warns = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warns.append(msg)


def repo_owner():
    try:
        url = subprocess.check_output(
            ["git", "-C", ROOT, "remote", "get-url", "origin"], text=True
        ).strip()
    except Exception:
        return None
    m = re.search(r"github\.com[:/]([^/]+)/", url)
    return m.group(1) if m else None


OWNER = repo_owner()


def read(path):
    with open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read()


def all_files():
    out = set()
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in {".git"}]
        for fn in fns:
            out.add(os.path.relpath(os.path.join(dp, fn), ROOT))
    return out


FILES = all_files()


def check_client(client, suffix):
    cdir = os.path.join(ROOT, client)
    if not os.path.isdir(cdir):
        warn(f"{client}: 目录不存在，跳过")
        return
    readme = os.path.join(cdir, "README.md")
    if not os.path.exists(readme):
        err(f"{client}: 缺少二级目录 README.md")
        return

    listed = [m.group(1) for m in map(LIST_ITEM.match, read(readme).splitlines()) if m]
    dirs = sorted(
        d for d in os.listdir(cdir)
        if os.path.isdir(os.path.join(cdir, d)) and not d.startswith(".")
    )

    for d in dirs:
        if d not in listed and (client, d) not in RESOURCE_DIRS:
            err(f"{client}/README.md: 清单缺 `{d}`（目录存在但二级 README 没写）")
    for item in listed:
        if item not in dirs:
            err(f"{client}/README.md: 清单里的 `{item}` 在目录中不存在（改名/删除后没更新）")
    run = []
    for line in read(readme).splitlines():
        m = LIST_ITEM.match(line)
        if m:
            run.append(m.group(1))
            continue
        if run:
            if run != sorted(run, key=str.casefold):
                warn(f"{client}/README.md: 清单顺序和目录排序不一致（建议按名称排序）")
            run = []
    if run and run != sorted(run, key=str.casefold):
        warn(f"{client}/README.md: 清单顺序和目录排序不一致（建议按名称排序）")

    for d in dirs:
        if (client, d) in RESOURCE_DIRS:
            if not os.path.exists(os.path.join(cdir, d, "README.md")):
                err(f"{client}/{d}: 资源目录缺少 README.md")
            continue
        mdir = os.path.join(cdir, d)
        files = []
        for dp, _dns, fns in os.walk(mdir):
            for fn in fns:
                files.append(os.path.relpath(os.path.join(dp, fn), mdir))
        if "README.md" not in files:
            err(f"{client}/{d}: 缺少模块 README.md")
        mods = [f for f in files if f.endswith(suffix)]
        if not mods:
            err(f"{client}/{d}: 缺少模块文件（{' / '.join(suffix)}）")

        for f in mods:
            path = os.path.join(mdir, f)
            rel = os.path.relpath(path, ROOT)
            text = read(path)
            if f.endswith(".sgmodule"):
                if re.search(r"^name:\s", text, re.M) and not re.search(r"^#!name\s*=", text, re.M):
                    warn(f"{rel}: 内容像 Egern/YAML 模块，确认放对客户端目录")
                    continue
                if not re.search(r"^#!name\s*=", text, re.M):
                    err(f"{rel}: 缺少 #!name=")
                if not re.search(r"^#!desc\s*=", text, re.M):
                    err(f"{rel}: 缺少 #!desc=")
            for m in re.finditer(r"^hostname\s*=\s*(.+)$", text, re.M):
                line = m.group(1)
                if "%APPEND%" not in line and "%INSERT%" not in line:
                    err(f"{rel}: hostname 未用 %APPEND%/%INSERT%，会覆盖主配置 MITM 列表")


def check_raw_refs():
    for rel in sorted(FILES):
        if not rel.endswith((".sgmodule", ".plugin", ".yaml", ".stoverride", ".conf", ".js")):
            continue
        text = read(os.path.join(ROOT, rel))
        for owner, branch, path in RAW_REF.findall(text):
            clean = urllib.parse.unquote(path.split("?")[0].split("#")[0])
            target = os.path.join(ROOT, clean)
            if not os.path.exists(target):
                err(f"{rel}: 引用的 raw 路径不存在 -> {clean}")
            if OWNER and owner != OWNER:
                warn(f"{rel}: 引用了别的仓库 {owner}（按 §3 应本地化）")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for client, suffix in CLIENTS.items():
        if only and client != only:
            continue
        check_client(client, suffix)
    check_raw_refs()

    for w in warns:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"\n合计：{len(errors)} error / {len(warns)} warning")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
