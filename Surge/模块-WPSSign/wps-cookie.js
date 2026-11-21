/**
 * WPS · Cookie 抓取
 *
 * 抓取:打开「WPS」APP → 进任意活动页(福利中心/任务中心/智点/签到)→ 自动触发,抓 wps_sid
 * 本地增强 (WorkBuddy 2026-11-12):记录抓取时间供体检脚本显示;模块同时匹配活动页与 App 配置接口。
 * 2026-11-12 二次增强:模块参数 Capture=0 可关闭抓取(已持久化的凭证保留,定时签到不受影响)。
 * 2026-11-12 三次增强:Capture=1 时每次命中都重新抓取/写入并弹「抓取成功」通知。
 * 2026-11-21 四次增强(26.11.0):新版 App 的 H5 请求把 Cookie 拆成多条 `cookie:` 头,
 *   到脚本里可能被合并成换行/逗号分隔,旧正则只认 "; " 分隔会漏;现在先归一化再匹配,
 *   并遍历全部头值兜底。另写入 wps_cookie_js_ver 供排查脚本是否已刷新。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-19 (上游) / 2026-11-21 (26.11.0 适配)
 */

const $ = new Env("WPS [Cookie]");
const JS_VER = "2026-11-21c";

const CK_KEY = "wps_sid"; // 只存 wps_sid 这一个长效登录态(activity 接口认 wps_sids,值与 wps_sid 相同)

function argVal(k, dflt) {
    try {
        if (typeof $argument !== "undefined" && $argument) {
            if (typeof $argument === "object") {
                return k in $argument && $argument[k] !== "" && $argument[k] != null ? String($argument[k]) : dflt;
            }
            const m = String($argument).match(new RegExp("(?:^|&)" + k + "=([^&]*)"));
            if (m && m[1] !== "") return decodeURIComponent(m[1].replace(/\+/g, " "));
        }
        return dflt;
    } catch (e) { return dflt; }
}

// 多值头归一化:同类头合并、换行/逗号(仅当后接 k=v 时才当分隔符)统一成 "; "
function headerValues(headers, name) {
    const out = [];
    for (const k of Object.keys(headers || {})) {
        if (String(k).toLowerCase() !== name) continue;
        const v = headers[k];
        if (Array.isArray(v)) v.forEach((x) => out.push(String(x)));
        else out.push(String(v));
    }
    return out;
}
function cookieString(headers) {
    const raw = headerValues(headers, "cookie").join("\n");
    return raw
        .replace(/[\r\n]+/g, "; ")
        .replace(/,\s*(?=[A-Za-z0-9_.-]+=)/g, "; ")
        .replace(/;\s*/g, "; ")
        .trim();
}
function pickSid(headers, url, body) {
    const ck = cookieString(headers);
    let m = ck.match(/(?:^|;\s*)wps_sids?=([^;]+)/);
    if (m) return { sid: m[1].trim(), from: "cookie" };
    // 兜底 1:任意头值里出现 wps_sid=...(有的网关会把 cookie 塞进别的头)
    for (const k of Object.keys(headers || {})) {
        const v = String(headers[k] || "");
        const mm = v.match(/wps_sids?=([^;\s,]+)/);
        if (mm) return { sid: mm[1], from: "header:" + k };
    }
    // 兜底 2:URL query(少数 H5 用 ?wps_sid=)
    try {
        const q = String(url || "").match(/[?&]wps_sids?=([^&#]+)/);
        if (q) return { sid: decodeURIComponent(q[1]), from: "query" };
    } catch (e) { }
    // 兜底 3:请求体(requires-body=true 时才有)
    try {
        const b = String(body || "").match(/wps_sids?["':=\s]+([A-Za-z0-9._-]{8,})/);
        if (b) return { sid: b[1], from: "body" };
    } catch (e) { }
    return { sid: "", from: "", ck };
}

(function main() {
    $.setdata(JS_VER, "wps_cookie_js_ver"); // 排查脚本是否已刷新
    if (String(argVal("Capture", "1")) === "0") {
        $.log("[INFO] 抓 Cookie 已在模块参数中关闭(Capture=0),跳过本次请求");
        $.done();
        return;
    }
    if (typeof $request === "undefined") {
        $.log("[ERROR] 该脚本仅作为 http-request 重写脚本运行");
        $.done();
        return;
    }
    if ($request.method === "OPTIONS") { $.done(); return; }

    try {
        const headers = $request.headers || {};
        // 不碰测试请求,避免联调把真凭证覆盖
        const got = pickSid(headers, $request.url, $request.body);
        if (!got.sid) {
            const names = Object.keys(headers).map((k) => String(k).toLowerCase());
            const ckCount = names.filter((n) => n === "cookie").length;
            // 诊断:把「请求里到底有什么」留一份,供体检查看,不记录任何 token 值
            $.setdata(JSON.stringify({
                t: Date.now(), url: String($request.url || "").slice(0, 120),
                cookieHeaders: ckCount, headerNames: names.slice(0, 30),
                anyHeaderHasSid: Object.keys(headers).some((k) => /wps_sids?=/.test(String(headers[k]))),
            }), "wps_cookie_dbg");
            $.log(`[WARN] 未找到 wps_sid(cookie头 ${ckCount} 个, 头名 ${names.join(",")})`);
            $.msg("WPS", "⚠️ 未抓到 Cookie",
                `页面请求没带 wps_sid(cookie头${ckCount}个)。请在「我的 → 任务中心」或灵犀里点一次领取后重试`);
            $.done();
            return;
        }
        const sid = got.sid;
        if (/^TEST_/.test(sid)) { $.log("[INFO] 测试请求,不写入"); $.done(); return; }

        const old = $.getdata(CK_KEY) || "";
        const changed = old !== sid;
        $.setdata(sid, CK_KEY);
        $.setdata(String(Date.now()), "wps_cookie_time");
        if (changed) $.setdata("", "wps_status");
        $.log(`[INFO] 已写入 wps_sid (${maskSid(sid)}, 来源 ${got.from})${changed ? " [新值]" : " [与上次相同]"}`);
        $.msg("WPS", "✅ WPS Cookie 获取成功",
            changed ? "凭证已更新,长按 wps-status 可查看" : "凭证有效,已重新写入");
    } catch (e) {
        $.log("[ERROR] cookie 抓取失败: " + e);
    }

    $.done();
})();

function maskSid(s) {
    if (!s || s.length < 12) return "已获取";
    return s.slice(0, 6) + "***" + s.slice(-4);
}

function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== "undefined";
    this.isQuanX = () => typeof $task !== "undefined";
    this.isLoon = () => typeof $loon !== "undefined";
    this.log = (...a) => console.log(a.join("\n"));
    this.msg = (t = this.name, s = "", b = "") => {
        if (this.isSurge() || this.isLoon()) $notification.post(t, s, b);
        else if (this.isQuanX()) $notify(t, s, b);
        console.log(["", "====📣" + t + "====", s, b].filter(Boolean).join("\n"));
    };
    this.getdata = (k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        return null;
    };
    this.setdata = (v, k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.write(v, k);
        if (this.isQuanX()) return $prefs.setValueForKey(v, k);
        return false;
    };
    this.done = (v = {}) => { if (typeof $done !== "undefined") $done(v); };
}
