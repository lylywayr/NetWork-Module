#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""我的华为 · 积分签到 —— HAR 提取 + 重放（纯标准库，给 NAS / 青龙 / 任意 Linux 用）

如果你不用 Surge 抓包（比如用 Reqable / Charles / Stream 抓的 HAR），用这个脚本：

  1) 看候选：      python3 huawei-har-replay.py cap.har
  2) 存模板：      python3 huawei-har-replay.py cap.har --save tpl.json
  3) 演练一次：    python3 huawei-har-replay.py --run tpl.json --dry
  4) 真跑：        python3 huawei-har-replay.py --run tpl.json
  5) 定时：        crontab -e  →  5 8 * * * python3 /path/huawei-har-replay.py --run /path/tpl.json

模板里的 Cookie 可以用 --cookie host=值 单独覆盖，或每次跑之前用
  --cookie-file cookies.txt（每行 host=完整Cookie）刷新。
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

SIGN = re.compile(r"(sign[-_]?in|check[-_]?in|qiandao|/sign(?:/|\?|$)|签到|打卡)", re.I)
POINT = re.compile(r"(积分|point|integral|credit|score|member|privilege)", re.I)
OKRE = re.compile(r"(签到成功|签到完成|已签到|重复签到|今日已签|success\"\s*:\s*true|\"ret\"\s*:\s*\"?0\"?|\"code\"\s*:\s*\"?0\"?)", re.I)
BADRE = re.compile(r"(失败|错误|未登录|请登录|登录失效|token.{0,8}(invalid|expire)|error|denied)", re.I)
DROP = re.compile(r"^(host|content-length|accept-encoding|connection|keep-alive|proxy-connection|"
                  r"priority|te|if-none-match|if-modified-since|cache-control|pragma|sec-fetch-.+|sec-ch-ua.+)$", re.I)
STATIC = re.compile(r"\.(js|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|map)(\?|$)", re.I)


def path_of(url):
    m = re.match(r"^https?://[^/?#]+([^?#]*)", url)
    return m.group(1) if m else url


def host_of(url):
    m = re.match(r"^https?://([^/?#]+)", url)
    return m.group(1) if m else ""


def text_of(entry):
    content = entry.get("response", {}).get("content", {}) or {}
    raw = content.get("text", "") or ""
    if content.get("encoding") == "base64":
        try:
            import base64
            raw = base64.b64decode(raw).decode("utf-8", "ignore")
        except Exception:
            return ""
    return raw


def load_har(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        har = json.load(f)
    entries = har.get("log", {}).get("entries", [])
    out, seen = [], {}
    for e in entries:
        req = e.get("request", {})
        url = req.get("url", "")
        if not url or STATIC.search(url):
            continue
        method = (req.get("method") or "GET").upper()
        resp_text = text_of(e)
        hit = bool(SIGN.search(url)) or (bool(SIGN.search(resp_text)) and bool(POINT.search(resp_text)))
        if not hit:
            continue
        headers = {}
        for h in req.get("headers", []):
            name = h.get("name", "")
            if not DROP.match(name):
                headers[name] = h.get("value", "")
        body = (req.get("postData", {}) or {}).get("text", "") or ""
        cookie = headers.get("Cookie") or headers.get("cookie") or ""
        rec = {
            "method": method,
            "url": url,
            "path": path_of(url).split("?")[0],
            "headers": headers,
            "cookie": cookie,
            "cookieHost": host_of(url),
            "body": body[:20000],
            "respHint": resp_text[:160].replace("\n", " "),
            "off": 0,
            "lastOk": "",
        }
        key = method + " " + rec["path"]
        seen[key] = rec  # 同一路径保留最后一次
    out = list(seen.values())
    return out


def load_cookie_file(path):
    """"host=完整Cookie" 每行一条，返回 {host: cookie}"""
    m = {}
    if not path or not os.path.exists(path):
        return m
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            h, _, v = line.partition("=")
            m[h.strip()] = v.strip()
    return m


def replay(tpls, dry=False, cookie_map=None, timeout=25):
    cookie_map = cookie_map or {}
    today = time.strftime("%Y-%m-%d")
    ok = fail = 0
    for i, r in enumerate(tpls, 1):
        if r.get("off") or not SIGN.search(r.get("url", "")):
            continue
        tag = "%s %s" % (r.get("method"), r.get("path"))
        if r.get("lastOk") == today:
            print("[%d] 跳过（今日已成功） %s" % (i, tag))
            continue
        if dry:
            print("[%d] 演练 %s\n      %s" % (i, tag, r.get("url")))
            continue
        headers = dict(r.get("headers") or {})
        for k in list(headers):
            if DROP.match(k):
                headers.pop(k, None)
        ck = cookie_map.get(r.get("cookieHost")) or r.get("cookie") or headers.get("Cookie") or ""
        if ck:
            headers["Cookie"] = ck
        data = None
        if r.get("method") != "GET" and r.get("body"):
            data = r["body"].encode("utf-8")
        req = urllib.request.Request(r["url"], data=data, headers=headers, method=r.get("method") or "GET")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8", "ignore")
                code = resp.status
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "ignore")
            code = e.code
        except Exception as e:
            print("[%d] 失败 %s → %s" % (i, tag, e))
            fail += 1
            continue
        good = 200 <= code < 400 and OKRE.search(body) and not BADRE.search(body[:300])
        if good:
            ok += 1
            r["lastOk"] = today
            print("[%d] 成功 %s → %s" % (i, tag, body[:80].replace("\n", " ")))
        else:
            fail += 1
            print("[%d] 失败 %s → HTTP %s %s" % (i, tag, code, body[:120].replace("\n", " ")))
        time.sleep(0.8)
    print("—— 成功 %d / 失败 %d ——" % (ok, fail))
    return tpls


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("har", nargs="?", help="抓包得到的 .har")
    ap.add_argument("--save", help="把候选请求存成模板 json")
    ap.add_argument("--run", help="按模板 json 重放")
    ap.add_argument("--dry", action="store_true", help="只打印，不发包")
    ap.add_argument("--cookie", action="append", default=[], help="host=Cookie，可多次")
    ap.add_argument("--cookie-file", help="每行 host=Cookie")
    a = ap.parse_args()

    cookie_map = load_cookie_file(a.cookie_file)
    for item in a.cookie:
        h, _, v = item.partition("=")
        if h:
            cookie_map[h.strip()] = v.strip()

    if a.run:
        with open(a.run, "r", encoding="utf-8") as f:
            tpls = json.load(f)
        tpls = replay(tpls, dry=a.dry, cookie_map=cookie_map)
        if not a.dry:
            with open(a.run, "w", encoding="utf-8") as f:
                json.dump(tpls, f, ensure_ascii=False, indent=2)
        return

    if not a.har:
        ap.print_help()
        sys.exit(1)
    tpls = load_har(a.har)
    if not tpls:
        print("HAR 里没有命中签到关键词的请求。先在 App 里点一次签到再抓，或手动确认接口。")
        sys.exit(2)
    for i, r in enumerate(tpls, 1):
        print("%2d. %-5s %s%s" % (i, r["method"], r["path"], "" if r["cookie"] else "  （无Cookie）"))
    if a.save:
        with open(a.save, "w", encoding="utf-8") as f:
            json.dump(tpls, f, ensure_ascii=False, indent=2)
        print("已写入 %s（%d 条）" % (a.save, len(tpls)))


if __name__ == "__main__":
    main()
