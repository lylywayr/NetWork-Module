/**
 * WPS · 领取动作样本学习 (2026-11-21)
 *
 * 背景:WPS 26.11.0 的「智点领取」走新的 custom_page/action 接口, 服务端真实字段没公开。
 * 与其猜, 不如让真客户端教一次 —— 你在 App 里手动点一次「领取智点」, 本脚本把那次请求体
 * 存进本机 $persistentStore("wps_custom_action")。定时签到下次跑「智点领取」时,
 * 会把样本里的活动号/页面号/privilege_id 替换成当天值直接复用, 字段结构与客户端逐字节一致。
 *
 * 触发:POST https://personal-act.wps.cn/activity-rubik/custom_page/action
 *      (以及旧接口 /activity-rubik/activity/component_action, 只记 custom_page)
 * 开关:模块参数 Learn=1(默认开) / 0 关闭。
 */

const $ = new Env("WPS [Learn]");
const KEY = "wps_custom_action";

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
    if (String(argVal("Learn", "1")) === "0") {
        $.log("[INFO] 样本学习已在模块参数中关闭(Learn=0)");
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
        const url = String($request.url || "");
        if (!/custom_page\/action/.test(url)) { $.done(); return; } // 旧接口不学,字段不同

        const body = $request.body || $request.bodyBytes || "";
        if (!body || String(body).length > 64 * 1024) { $.done(); return; }

        const j = JSON.parse(String(body));
        const action = String(j.component_action || "");
        // 只学真正发奖励的动作,浏览/曝光类不存
        if (action !== "privilege_grant.exec") { $.done(); return; }
        if (!/privilege_grant|zhidian/.test(String(body))) { $.done(); return; }

        const rec = { tpl: "custom", url: url.split("?")[0], action, body: j, t: Date.now() };
        const s = JSON.stringify(rec);
        const old = $.getdata(KEY) || "";
        $.setdata(s, KEY);
        if (old !== s) {
            $.log("[INFO] 已学习 custom_page/action 样本: " + JSON.stringify(j).slice(0, 300));
            $.msg("WPS", "✅ 已学习领取动作", "下次定时任务会按客户端真实结构领取智点");
        } else {
            $.log("[INFO] 样本与上次一致,无需更新");
        }
    } catch (e) {
        $.log("[ERROR] 样本学习失败: " + e);
    }

    $.done();
})();

function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== "undefined";
    this.log = (...a) => console.log(a.join("\n"));
    this.msg = (t = this.name, sub = "", b = "") => {
        if (typeof $notification !== "undefined") $notification.post(t, sub, b);
        else if (typeof $notify !== "undefined") $notify(t, sub, b);
        console.log(["", "====" + t + "====", sub, b].filter(Boolean).join("\n"));
    };
    this.getdata = (k) => {
        if (typeof $persistentStore !== "undefined") return $persistentStore.read(k);
        if (typeof $prefs !== "undefined") return $prefs.valueForKey(k);
        return null;
    };
    this.setdata = (v, k) => {
        if (typeof $persistentStore !== "undefined") return $persistentStore.write(v, k);
        if (typeof $prefs !== "undefined") return $prefs.setValueForKey(v, k);
        return false;
    };
    this.done = (v = {}) => { if (typeof $done !== "undefined") $done(v); };
}
