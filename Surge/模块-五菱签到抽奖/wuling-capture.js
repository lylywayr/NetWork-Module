/*
 * 五菱汽车 · 凭证抓取
 * 触发类型：http-request
 *
 * 抓包结论（2026-11-11，Surge iOS HAR）：
 *   签到/任务 H5 的接口域名是 operation.wuling.com。App 通过 JSBridge 的
 *   openMsgToken() 把 accessToken / userId 注入页面，页面公共请求封装把它们
 *   拼进每个 POST 的表单：scene=&originalToken=<accessToken>&userIdStr=<userId>。
 *   authorization / llbtoken / appid 三个头实测为空，真正生效的是表单凭证 + Cookie。
 *
 * 因此本脚本同时保存：
 *   1. 表单凭证 originalToken / userIdStr（requires-body=true 才能拿到）；
 *   2. Cookie 等请求头（full-header-mode=true 才能拿到多个同名 Cookie）。
 *
 * 全程只读，不修改、不阻断任何请求。凭证只存本机 $persistentStore。
 */

var KEY_CRED = 'wuling_cred_v1';
var KEY_CRED_TIME = 'wuling_cred_time_v1';
var KEY_PROBE = 'wuling_probe_v1';
var KEY_NOTIFY = 'wuling_capture_notify_v1';

// 只保留这些请求头，避免把 Content-Length 之类透传到后续签到请求
var CRED_HEADERS = [
  'authorization', 'llbtoken', 'appid', 'cookie',
  'x-requested-with', 'accept', 'origin', 'referer', 'user-agent'
];

// 表单里需要保存的凭证字段（比较时用小写，存储时保留原始大小写）
var FORM_KEYS = [
  'originaltoken', 'useridstr', 'accesstoken', 'token',
  'userid', 'scene', 'ym', 'appversion', 'ostype'
];


/* Surge 模块参数：Host 用于接口改域名时同步放宽匹配，默认实测域名 */
function parseArgument(s) {
  var out = {}, parts = String(s || '').split('&'), i;
  for (i = 0; i < parts.length; i++) {
    var kv = parts[i].split('='), k, v = '';
    try { k = decodeURIComponent(kv[0] || ''); } catch (e) { k = kv[0] || ''; }
    try { v = decodeURIComponent(kv.slice(1).join('=')); } catch (e) { v = kv.slice(1).join('='); }
    if (k) out[k] = v;
  }
  return out;
}
var ARGS = parseArgument(typeof $argument === 'string' ? $argument : '');
var ALLOW_HOST = String(ARGS.Host || 'operation.wuling.com')
  .replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();

function log(m) { console.log('[五菱·抓取] ' + m); }

function read(k) {
  try { return $persistentStore.read(k); } catch (e) { return null; }
}

function write(k, v) {
  try { return $persistentStore.write(String(v), k); } catch (e) { return false; }
}

function stamp(t) {
  var d = new Date(t);
  function p(n) { return n < 10 ? '0' + n : '' + n; }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

function mask(s) {
  if (!s) return '';
  s = String(s);
  return s.length <= 10 ? '***' : s.substring(0, 4) + '***(' + s.length + ')';
}

function hostOf(url) {
  var m = /^https?:\/\/([^\/:?#]+)/i.exec(url || '');
  return m ? m[1].toLowerCase() : '';
}

function originOf(url) {
  var m = /^(https?:\/\/[^\/:?#]+)/i.exec(url || '');
  return m ? m[1] : '';
}

function pathOf(url) {
  var m = /^https?:\/\/[^\/]+(\/[^?#]*)?/i.exec(url || '');
  return m && m[1] ? m[1] : '/';
}

/* 兼容两种形态：普通对象，或 full-header-mode 下的 [{field,value}] 数组 */
function normalizeHeaders(raw) {
  var out = {}, i, k, v, item;
  if (Object.prototype.toString.call(raw) === '[object Array]') {
    for (i = 0; i < raw.length; i++) {
      item = raw[i] || {};
      k = String(item.field || item.name || '').toLowerCase();
      v = item.value === undefined || item.value === null ? '' : String(item.value);
      if (!k) continue;
      if (k === 'cookie' && out[k]) out[k] = out[k] + '; ' + v;
      else out[k] = v;
    }
  } else {
    for (k in (raw || {})) {
      if (Object.prototype.hasOwnProperty.call(raw || {}, k)) {
        out[k.toLowerCase()] = raw[k] === undefined || raw[k] === null ? '' : String(raw[k]);
      }
    }
  }
  return out;
}

function parseForm(body) {
  var out = {}, parts = String(body || '').split('&'), i;
  for (i = 0; i < parts.length; i++) {
    var kv = parts[i].split('=');
    var rawKey, val;
    try { rawKey = decodeURIComponent(kv[0] || ''); } catch (e) { rawKey = kv[0] || ''; }
    try { val = decodeURIComponent(kv.slice(1).join('=')); } catch (e) { val = kv.slice(1).join('='); }
    if (FORM_KEYS.indexOf(rawKey.toLowerCase()) >= 0 && val) out[rawKey] = val;
  }
  return out;
}

function appendProbe(record) {
  var list = [];
  try { list = JSON.parse(read(KEY_PROBE) || '[]'); } catch (e) { list = []; }
  if (!(list instanceof Array)) list = [];
  if (list.indexOf(record) >= 0) return;
  list.push(record);
  if (list.length > 40) list = list.slice(list.length - 40);
  write(KEY_PROBE, JSON.stringify(list));
  log(record);
}

function notify(title, sub, body) {
  try { $notification.post(title, sub, body); } catch (e) { log('通知不可用'); }
}

(function main() {
  var req = $request || {};
  var url = req.url || '';
  var host = hostOf(url);

  // 双保险：模块 pattern 已收窄，这里再确认一次，避免误存其它域名的凭证
  if (host.indexOf(ALLOW_HOST) < 0) { $done({}); return; }

  var headers = normalizeHeaders(req.headers);
  var form = parseForm(req.body);
  var picked = {}, names = [], i;
  for (i = 0; i < CRED_HEADERS.length; i++) {
    var n = CRED_HEADERS[i];
    if (headers[n]) { picked[n] = headers[n]; names.push(n); }
  }

  // 只有拿到 originalToken 才更新凭证，防止图片/埋点请求把已有凭证覆盖掉
  if (!form.originalToken) { $done({}); return; }

  var cred = {
    headers: picked,
    form: form,
    origin: originOf(url),
    host: host,
    samplePath: pathOf(url),
    ts: Date.now()
  };

  var oldRaw = read(KEY_CRED);
  var oldToken = '';
  if (oldRaw) {
    try { oldToken = (JSON.parse(oldRaw).form || {}).originalToken || ''; } catch (e) { oldToken = ''; }
  }

  write(KEY_CRED, JSON.stringify(cred));
  write(KEY_CRED_TIME, stamp(Date.now()));
  appendProbe((req.method || 'POST') + ' ' + pathOf(url) +
    ' | 表单:' + Object.keys(form).join(',') + ' | token:' + mask(form.originalToken) +
    ' | 头:' + (names.join(',') || '无'));

  if (oldToken !== form.originalToken) {
    log('凭证更新：' + host + ' token=' + mask(form.originalToken));
    var last = parseInt(read(KEY_NOTIFY) || '0', 10);
    if (isNaN(last)) last = 0;
    if (Date.now() - last > 10 * 60 * 1000) {
      write(KEY_NOTIFY, String(Date.now()));
      notify('五菱 · 凭证已更新', '来源 ' + host,
        '已保存 originalToken、userIdStr 与 Cookie。长按「五菱·查状态」可确认。');
    }
  }

  $done({});
})();
