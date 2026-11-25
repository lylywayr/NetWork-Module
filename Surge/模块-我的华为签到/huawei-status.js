/*!
 * 我的华为 · 积分签到 —— 体检 / 管理
 *
 * 在 Surge「脚本」列表里长按本条 → 运行。
 * 参数 Action：
 *   list（默认）  列出已学到的模板
 *   clear         清空全部模板与 Cookie（重新学习用）
 *   del:<序号>    删除某一条（序号见 list）
 *   off:<序号>    暂停某一条（不删，重放时跳过）
 *   on:<序号>     恢复某一条
 */

(function () {
  var ARG = typeof $argument === "string" ? $argument : "";
  var P = {};
  ARG.split("&").forEach(function (kv) {
    var i = kv.indexOf("=");
    if (i > 0) P[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  });
  var action = String(P.Action || "list").trim();
  var KEY = "hw_point_tpl_v1";
  var CK = "hw_point_ck_";

  var list;
  try { list = JSON.parse($persistentStore.read(KEY) || "[]"); } catch (e) { list = []; }
  if (!Array.isArray(list)) list = [];

  function save() { $persistentStore.write(JSON.stringify(list), KEY); }
  function post(t, s, b) { $notification.post(t, s, b || ""); }

  if (action === "clear") {
    $persistentStore.write("[]", KEY);
    var hosts = {};
    list.forEach(function (r) { var h = /^https?:\/\/([^\/?#]+)/i.exec(r.url || ""); if (h) hosts[h[1]] = 1; });
    Object.keys(hosts).forEach(function (h) { $persistentStore.write("", CK + h); });
    post("我的华为签到", "已清空", "模板与 Cookie 都删了，下次打开 App 点一次签到重新学");
    return $done();
  }

  var m = /^(del|off|on):(\d+)$/.exec(action);
  if (m) {
    var n = parseInt(m[2], 10) - 1;
    if (n < 0 || n >= list.length) { post("我的华为签到", "序号不存在", "先运行一次 list 看序号"); return $done(); }
    if (m[1] === "del") { list.splice(n, 1); save(); post("我的华为签到", "已删除第 " + (n + 1) + " 条", ""); }
    else { list[n].off = m[1] === "off" ? 1 : 0; save(); post("我的华为签到", "第 " + (n + 1) + " 条已" + (m[1] === "off" ? "暂停" : "恢复"), ""); }
    return $done();
  }

  if (!list.length) {
    post("我的华为签到 · 模板", "0 条", "先在 App 里点一次签到（MITM 与证书要已就绪）");
    return $done();
  }

  var lines = list.map(function (r, i) {
    var h = /^https?:\/\/([^\/?#]+)/i.exec(r.url || "");
    var ck = h ? $persistentStore.read(CK + h[1]) : "";
    var flag = r.off ? "⏸" : "▶";
    var ok = r.lastOk ? " ✓" + r.lastOk.slice(5) : "";
    return (i + 1) + ". " + flag + " " + r.method + " " + (r.path || "") + ok + (ck ? "" : "（无Cookie）");
  });

  var chunk = [], size = 0;
  lines.forEach(function (l) {
    if (size + l.length > 700) { post("我的华为签到 · 模板", "共 " + list.length + " 条", chunk.join("\n")); chunk = []; size = 0; }
    chunk.push(l); size += l.length + 1;
  });
  if (chunk.length) post("我的华为签到 · 模板", "共 " + list.length + " 条（" + lines.filter(function (l) { return l.indexOf("⏸") < 0; }).length + " 条启用）", chunk.join("\n"));
  $done();
})();
