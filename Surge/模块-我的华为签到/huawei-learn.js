/*!
 * 我的华为 · 积分签到 —— 学习器（http-response）
 *
 * 作用：你在「我的华为」App 里手动点一次签到，脚本把那次真实请求的
 *      方法 / 完整请求头 / 请求体 / Cookie 原样落到本机，供 huawei-signin.js 每天重放。
 *      只读流量：不修改、不阻断、不伪造任何请求。
 *
 * 存储：
 *   hw_point_tpl_v1       模板数组（按 方法+路径 去重，保留最新一份）
 *   hw_point_ck_<host>    该主机最近一次见到的 Cookie（重放时用它覆盖旧 Cookie）
 *
 * 参数：Learn=0 关闭学习；Learn=1 默认开启。
 */

(function () {
  var ARG = typeof $argument === "string" ? $argument : "";
  var P = {};
  ARG.split("&").forEach(function (kv) {
    var i = kv.indexOf("=");
    if (i > 0) P[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  });
  if (String(P.Learn) === "0") return $done({});

  var KEY = "hw_point_tpl_v1";
  var CK = "hw_point_ck_";
  var MAX = 30;
  var MAX_BODY = 20000;

  var req = $request || {};
  var res = $response || {};
  var url = req.url || "";
  var method = String(req.method || "GET").toUpperCase();
  var headers = req.headers || {};
  var reqBody = req.body || "";
  var respBody = String(res.body || "");

  // 静态资源与埋点直接跳过，别把模板表塞满
  if (/\.(js|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|map)(\?|$)/i.test(url)) return $done({});
  if (/\.(gif|png|jpe?g|webp)$/i.test(String(headers["Content-Type"] || headers["content-type"] || ""))) return $done({});

  var SIGN = /(sign[-_]?in|check[-_]?in|qiandao|\/sign(\/|\?|$)|签到|打卡)/i;
  var POINT = /(积分|point|integral|credit|score|member|privilege)/i;
  var OKRES = /(签到成功|签到完成|已签到|重复签到|今日已签|获得[^。，]{0,8}积分)/;

  var urlHit = SIGN.test(url);
  var respHit = SIGN.test(respBody) && POINT.test(respBody);
  var okHit = OKRES.test(respBody);
  if (!urlHit && !respHit && !okHit) return $done({});

  // 只收文本响应，二进制（图片/压缩包）不落库
  var textLike = /\{/.test(respBody.slice(0, 64)) || /^\[/.test(respBody.slice(0, 64)) ||
    /json|text|javascript|xml/i.test(String(res.headers && (res.headers["Content-Type"] || res.headers["content-type"]) || ""));
  if (!textLike) return $done({});

  function hostOf(u) {
    var m = /^https?:\/\/([^\/?#]+)/i.exec(u);
    return m ? m[1] : "";
  }
  function pathOf(u) {
    var m = /^https?:\/\/[^\/?#]+([^?#]*)/i.exec(u);
    return m ? m[1] : u;
  }
  function load() {
    try {
      var v = JSON.parse($persistentStore.read(KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  var host = hostOf(url);
  var cookie = headers["Cookie"] || headers["cookie"] || "";
  if (cookie) $persistentStore.write(String(cookie), CK + host);

  // 记录头：留下协议相关的，丢掉逐次变化的
  var DROP = /^(host|content-length|accept-encoding|connection|keep-alive|proxy-connection|priority|te|upgrade-insecure-requests|if-none-match|if-modified-since|cache-control|pragma|sec-fetch-.+|sec-ch-ua.+)$/i;
  var keep = {};
  Object.keys(headers).forEach(function (k) {
    if (!DROP.test(k)) keep[k] = headers[k];
  });

  var path = pathOf(url);
  var list = load();
  var key = method + " " + path.split("?")[0];
  var old = null;
  list = list.filter(function (r) {
    if ((r.method + " " + (r.path || "")) === key) {
      old = r;
      return false;
    }
    return true;
  });

  var rec = {
    method: method,
    url: url,
    path: path.split("?")[0],
    headers: keep,
    body: reqBody.length > MAX_BODY ? reqBody.slice(0, MAX_BODY) : reqBody,
    cookieHost: host,
    respHint: respBody.slice(0, 160).replace(/\s+/g, " "),
    hits: (urlHit ? "url " : "") + (okHit ? "ok" : ""),
    ts: Date.now(),
    lastOk: old && old.lastOk ? old.lastOk : "",
    off: old && old.off ? 1 : 0
  };
  list.push(rec);
  if (list.length > MAX) list = list.slice(list.length - MAX);
  $persistentStore.write(JSON.stringify(list), KEY);

  if (!old || old.url !== url) {
    $notification.post(
      "我的华为签到 · 已学到请求",
      method + " " + path.split("?")[0],
      "共 " + list.length + " 条模板，稍后长按 huawei-status 可查清单"
    );
  }
  $done({});
})();
