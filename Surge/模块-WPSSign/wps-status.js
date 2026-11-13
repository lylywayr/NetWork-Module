/**
 * WPS · 体检 / 状态自检 (WorkBuddy, 2026-11-12)
 *
 * 在 Surge 脚本页长按运行：核对凭证、登录态、今日签到状态、当前活动页组件，
 * 展示类组件只有编号、不是任务，不再显示；只有出现带业务数据的新组件才提示。
 *
 * 参数：clear=1 清空本机凭证；ActivityNumber / PageNumber / Position 由模块设置传入。
 * 上游脚本：MaYIHEI/paperclip app/wps/
 */

const $ = new Env("WPS 体检");
const CK_KEY = "wps_sid";

const DEF_ACT = "HD2025031721339450";
const DEF_PAGE = "YM2025060910400185";
const DEF_POS = "ios_flzx_grzxsdjg3001";
const BUSINESS_FIELDS = ["fragment_collect", "lottery_v2", "divide_prize", "privilege_select"];
const SKIP_FIELDS = new Set(["number", "component_node_id", "component_type", "type",
    "component_name", "name", "ui_style_config", "style", "sort", "index"]);
const ISLOGIN = "https://account.wps.cn/api/v3/islogin";
const DAY_INFO = "https://personal-bus.wps.cn/sign_in/v1/day_info";
const PAGE_INFO = "https://personal-act.wps.cn/activity-rubik/activity/page_info";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WpsiOS/26.6.1";

function arg(k, dflt) {
    try {
        if (typeof $argument !== "undefined" && $argument) {
            if (typeof $argument === "object") {
                return k in $argument && $argument[k] !== "" ? String($argument[k]) : dflt;
            }
            const m = String($argument).match(new RegExp("(?:^|&)" + k + "=([^&]*)"));
            if (m && m[1] !== "") return decodeURIComponent(m[1].replace(/\+/g, " "));
        }
        return dflt;
    } catch (e) { return dflt; }
}

function mask(s) {
    if (!s || s.length < 12) return "已获取";
    return s.slice(0, 6) + "***" + s.slice(-4);
}

function get(url, headers) {
    return new Promise((resolve, reject) => {
        if (typeof $httpClient !== "undefined") {
            $httpClient.get({ url, headers }, (err, resp, data) => err ? reject(err) : resolve(data || ""));
        } else if (typeof $task !== "undefined") {
            $task.fetch({ url, headers, method: "GET" }).then((r) => resolve(r.body || ""), (e) => reject(e.error || e));
        } else {
            reject(new Error("仅支持 Surge / Loon / Quantumult X"));
        }
    });
}

function json(s) {
    try { return JSON.parse(s); } catch (e) { return null; }
}

(async () => {
    const lines = [];

    if (arg("clear", "0") === "1") {
        $.setdata("", CK_KEY);
        $.setdata("", "wps_cookie_time");
        $.setdata("", "wps_status");
        $.msg("WPS 体检", "✅ 凭证已清除", "打开一次 WPS 活动页即可重新抓取");
        $.done();
        return;
    }

    const sid = $.getdata(CK_KEY) || "";
    lines.push(sid ? `凭证：已抓到 ${mask(sid)}` : "凭证：❌ 未抓到（打开一次 WPS 活动页）");

    // 活动参数（与模块设置保持一致）
    const act = arg("ActivityNumber", DEF_ACT);
    const page = arg("PageNumber", DEF_PAGE);
    const pos = arg("Position", DEF_POS);
    lines.push(`活动：${act}`);

    if (!sid) {
        finish(lines);
        return;
    }

    const headers = {
        "User-Agent": UA,
        "Cookie": `wps_sid=${sid}; wps_sids=${sid}`,
        "Origin": "https://personal-act.wps.cn",
        "Referer": "https://personal-act.wps.cn/",
    };

    // 1) 登录态
    try {
        const j = json(await get(ISLOGIN, headers));
        const ok = j && j.result === "ok" && j.userid;
        lines.push(ok ? "登录态：✅ 有效" : `登录态：❌ 已失效（${(j && j.msg) || "请重新抓取 Cookie"}）`);
        if (!ok) { finish(lines); return; }
    } catch (e) {
        lines.push(`登录态：⚠️ 网络异常 ${String(e).slice(0, 40)}`);
    }

    // 2) 今日签到状态
    try {
        const j = json(await get(DAY_INFO, headers));
        const info = (j && j.data && j.data.info) || {};
        const rw = (info.reward_name || []).join("/");
        lines.push(info.has_sign ? `今日签到：✅ 已签 ${rw}` : `今日签到：⏳ 未签（奖励 ${rw || "积分"}）`);
    } catch (e) {
        lines.push("今日签到：⚠️ 查询失败");
    }

    // 3) 当前活动页组件（双通道，与签到脚本一致）
    const base = `${PAGE_INFO}?activity_number=${act}&page_number=${page}`;
    const filter = encodeURIComponent(JSON.stringify({ cs_from: "", mk_key: "", position: pos }));
    let best = null;
    for (const u of [`${base}&filter_params=${filter}`, base]) {
        try {
            const j = json(await get(u, headers));
            if (!j || j.result !== "ok" || !Array.isArray(j.data)) continue;
            const score = j.data.filter((c) => c && (c.fragment_collect || c.lottery_v2 || c.divide_prize || c.privilege_select)).length;
            if (!best || score > best.score) best = { data: j.data, score };
        } catch (e) { /* 单通道失败继续试下一个 */ }
    }

    if (best) {
        const hit = BUSINESS_FIELDS.filter((f) => best.data.some((c) => c && c[f]));
        // 只有编号的组件是图片/规则/商品展示,不算任务,不再显示;
        // 只有出现「带业务数据对象」的第 5 类组件时才提示可能是新任务。
        const candidates = best.data.filter((c) => c && Object.keys(c).some((k) =>
            !SKIP_FIELDS.has(k) && c[k] && typeof c[k] === "object" &&
            !Array.isArray(c[k]) && !BUSINESS_FIELDS.includes(k)));
        lines.push(`活动页：${best.data.length} 个组件，可领任务 ${hit.length}/4 类`);
        lines.push(hit.length === 4 ? "任务组件：✅ 四类齐全" : "任务组件：⚠️ 有缺失，可能已换期");
        if (candidates.length) lines.push(`⚠️ 发现 ${candidates.length} 个带业务数据的新组件，可能是新任务`);
    } else {
        lines.push("活动页：❌ 读取失败，可能已换期或网络不通");
    }

    // 4) 最近一次运行结果与抓取时间
    const st = $.getdata("wps_status") || "";
    if (st) {
        const j = json(st);
        if (j && j.msg) lines.push(`上次运行：${j.msg.slice(0, 60)}`);
    } else {
        lines.push("上次运行：暂无记录（长按 wps-signin 可手动跑一次）");
    }
    const t = $.getdata("wps_cookie_time");
    if (t) lines.push(`凭证抓取：${new Date(Number(t) + 8 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ")}`);

    finish(lines);
})().catch((e) => {
    $.msg("WPS 体检", "❌ 运行异常", String(e));
    $.done();
});

function finish(lines) {
    $.msg("WPS 体检", lines[0], lines.slice(1).join("\n"));
    lines.forEach((l) => $.log(l));
    $.done();
}

function Env(s) {
    this.name = s;
    this.log = (...a) => console.log(a.join("\n"));
    this.msg = (t = this.name, sub = "", body = "") => {
        if (typeof $notification !== "undefined") $notification.post(t, sub, body);
        else if (typeof $notify !== "undefined") $notify(t, sub, body);
        console.log(["", "====" + t + "====", sub, body].filter(Boolean).join("\n"));
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
