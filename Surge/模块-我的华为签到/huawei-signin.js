/*!
 * 我的华为 · 积分签到 —— 定时重放（cron）
 *
 * 读 huawei-learn.js 学到的模板，逐条按原方法 / 原头 / 原体重发，
 * Cookie 用 hw_point_ck_<host> 里最新的一份覆盖（你只要偶尔打开 App，凭证就自动续上）。
 * 每条模板当天成功过就跳过，重复运行不会重复签。
 *
 * 参数：CronExp 由模块控制；DryRun=1 只打印不发包。
 */

(function () {
  var ARG = typeof $argument === "string" ? $argument : "";
  var P = {};
  ARG.split("&").forEach(function (kv) {
    var i = kv.indexOf("=");
    if (i > 0) P[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  });

  var KEY = "hw_point_tpl_v1";
  var CK = "hw_point_ck_";
  var DRY = String(P.DryRun) === "1";

  var SIGN = /(sign[-_]?in|check[-_]?in|qiandao|\/sign(\/|\?|$)|签到|打卡)/i;
  var OKRE = /(签到成功|签到完成|已签到|重复签到|今日已签|success"\s*:\s*true|"ret"\s*:\s*"?0"?|"code"\s*:\s*"?0"?)/i;
  var BADRE = /(失败|错误|未登录|请登录|登录失效|token.{0,8}(invalid|expire)|error|denied)/i;

  var d = new Date();
  var today = d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  function p2(n) { return n < 10 ? "0" + n : "" + n; }
  function hostOf(u) { var m = /^https?:\/\/([^\/?#]+)/i.exec(u || ""); return m ? m[1] : ""; }
  function tail(u) {
    var s = String(u || "").replace(/^https?:\/\/[^\/]+/i, "");
    return s.length > 64 ? s.slice(0, 61) + "..." : s;
  }

  var list;
  try { list = JSON.parse($persistentStore.read(KEY) || "[]"); } catch (e) { list = []; }
  if (!Array.isArray(list) || !list.length) {
    $notification.post("我的华为签到", "没有可用模板", "先在「我的华为」里手动点一次签到，让 huawei-learn 抓下请求");
    return $done();
  }

  var queue = list.filter(function (r) { return r && !r.off && SIGN.test(r.url || ""); });
  if (!queue.length) {
    $notification.post("我的华为签到", "模板里没有签到类请求", "共 " + list.length + " 条模板，长按 huawei-status 查看");
    return $done();
  }

  var idx = 0, ok = 0, fail = 0, lines = [];

  function save(arr) { $persistentStore.write(JSON.stringify(arr), KEY); }

  function step() {
    if (idx >= queue.length) return finish();
    var rec = queue[idx++];
    var tag = rec.method + " " + tail(rec.url);

    if (rec.lastOk === today) {
      lines.push("· 跳过（今日已成功） " + tag);
      return step();
    }
    if (DRY) {
      lines.push("· [演练] " + tag);
      return step();
    }

    var headers = {};
    Object.keys(rec.headers || {}).forEach(function (k) {
      if (!/^(host|content-length|accept-encoding|connection)$/i.test(k)) headers[k] = rec.headers[k];
    });
    var ck = $persistentStore.read(CK + hostOf(rec.url));
    if (ck) headers["Cookie"] = ck;

    var opts = { url: rec.url, headers: headers, timeout: 25 };
    var isGet = String(rec.method).toUpperCase() === "GET";
    if (!isGet && rec.body) opts.body = rec.body;

    var fn = isGet ? $httpClient.get : $httpClient.post;
    fn(opts, function (err, resp, data) {
      var body = String(data || "");
      var code = resp && resp.status ? resp.status : 0;
      var hitOk = !err && code >= 200 && code < 400 && OKRE.test(body) && !BADRE.test(body.slice(0, 300));
      if (hitOk) {
        ok++;
        rec.lastOk = today;
        // 回写原数组里同一条
        for (var i = 0; i < list.length; i++) {
          if (list[i].method === rec.method && list[i].path === rec.path) { list[i].lastOk = today; break; }
        }
        save(list);
        lines.push("· 成功 " + tag + " → " + body.slice(0, 80).replace(/\s+/g, " "));
      } else {
        fail++;
        var why = err ? String(err) : "HTTP " + code + " " + body.slice(0, 80).replace(/\s+/g, " ");
        lines.push("· 失败 " + tag + " → " + why);
      }
      setTimeout(step, 600);
    });
  }

  function finish() {
    var title = fail === 0 ? "我的华为签到 · 完成" : "我的华为签到 · 有失败";
    var sub = "成功 " + ok + " / 失败 " + fail + " / 共 " + queue.length + (DRY ? "（演练）" : "");
    var body = lines.join("\n");
    if (body.length > 900) body = body.slice(0, 900) + "\n…";
    $notification.post(title, sub, body);
    $done();
  }

  step();
})();
