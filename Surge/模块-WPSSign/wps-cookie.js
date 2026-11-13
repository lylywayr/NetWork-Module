/**
 * WPS · Cookie 抓取
 *
 * 抓取:打开「WPS」APP → 进任意活动页(任务中心/福利中心,如「天天领福利」)→ 自动触发 page_info,抓 wps_sid
 * 本地增强 (WorkBuddy 2026-11-12):记录抓取时间供体检脚本显示;模块同时匹配活动页与 App 配置接口,
 * 两个入口都能抓到 wps_sid / wps_sids,兼容新旧版 App。
 * 2026-11-12 二次增强:模块参数 Capture=0 可关闭抓取(已持久化的凭证保留,定时签到不受影响)。
 * 2026-11-12 三次增强:Capture=1 时每次命中都重新抓取/写入并弹「抓取成功」通知;
 *   只有 sid 真的变化才清掉体检结果,避免反复抹掉上次运行记录。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-19 (上游) / 2026-11-12 (本地)
 */

const $ = new Env("WPS [Cookie]");

const CK_KEY = "wps_sid"; // 只存 wps_sid 这一个长效登录态(activity 接口认 wps_sids,值与 wps_sid 相同)

// 模块参数 Capture=0 时跳过抓取。注意:只关「抓取/写入」,不清已存凭证,
// 所以定时签到照常能跑 —— 抓 Cookie 和做任务是两个独立开关,不该互相牵连。
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

(function main() {
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
    if ($request.method === "OPTIONS") {
        $.done();
        return;
    }

    try {
        // page_info 请求头里带整套 cookie,从中只取 wps_sid(域 wps.cn 的持久登录态,不轮换、无需刷新)
        const cookie = ($request.headers["Cookie"] || $request.headers["cookie"] || "");
        const m = cookie.match(/(?:^|;\s*)wps_sids?=([^;]+)/);
        if (!m) {
            $.log("[WARN] 请求头里没找到 wps_sid,可能该请求未带登录态,换个活动页重试");
            // 开关开着就该有反馈,但没抓到不能冒称成功
            $.msg("WPS", "⚠️ 未抓到 Cookie", "请确认 WPS 已登录,并停留在签到/福利中心活动页");
            $.done();
            return;
        }
        const sid = m[1];

        // 按要求:Capture 开着时,每次命中都重新写入并弹通知,不再因「值没变」而静默跳过。
        const old = $.getdata(CK_KEY) || "";
        const changed = old !== sid;

        $.setdata(sid, CK_KEY);
        $.setdata(String(Date.now()), "wps_cookie_time");
        if (changed) $.setdata("", "wps_status"); // 只有凭证真的换了,才撤掉旧的体检结果
        $.log(`[INFO] 已写入 wps_sid (${maskSid(sid)})${changed ? " [新值]" : " [与上次相同,按要求仍写入]"}`);
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
