/**
 * WPS · Cookie 抓取
 *
 * 抓取:打开「WPS」APP → 进任意活动页(任务中心/福利中心,如「天天领福利」)→ 自动触发 page_info,抓 wps_sid
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-19
 * @Module: https://github.com/lylywayr/NetWork-Module (Surge 模块封装，仅加参数开关)
 */

const $ = new Env("WPS [Cookie]");

const CK_KEY = "wps_sid"; // 只存 wps_sid 这一个长效登录态(activity 接口认 wps_sids,值与 wps_sid 相同)

// ===== Surge 模块参数：cookie=false 时关闭抓取（模块版新增）=====
function cookieDisabled() {
    if (typeof $argument === "undefined" || $argument === null || $argument === "") return false;
    const v = String($argument).trim().toLowerCase();
    if (!v) return false;
    if (v === "false" || v === "0" || v === "off" || v === "no") return true;
    return /(?:^|[;&\s])cookie\s*[=:]\s*(?:false|0|off|no)\b/.test(v);
}

(function main() {
    if (cookieDisabled()) {
        $.log("[INFO] 模块参数 cookie=false，已关闭 Cookie 抓取，跳过");
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
            $.done();
            return;
        }
        const sid = m[1];

        const old = $.getdata(CK_KEY) || "";
        if (old === sid) {
            $.log("[INFO] wps_sid 未变,跳过更新");
            $.done();
            return;
        }

        $.setdata(sid, CK_KEY);
        $.log(`[INFO] 已更新 wps_sid (${maskSid(sid)})`);
        $.setdata("", "wps_status"); // 新 Cookie 待签到验证,先撤掉旧的体检结果
        $.msg("WPS", "✅ WPS Cookie 获取成功", "可去签到脚本验证");
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
