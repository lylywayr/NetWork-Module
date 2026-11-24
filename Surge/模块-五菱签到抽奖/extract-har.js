/*
 * 五菱签到 · 抓包瘦身工具
 *
 * 作用：把几十 MB 的抓包文件过滤成一份几百 KB 的精简报告，
 *       只保留疑似签到 / 任务 / 积分 / 登录相关的请求，并自动给凭证、手机号打码。
 *
 * 用法：node extract-har.js "抓包文件路径" [输出目录]
 *       输出目录省略时，写到抓包文件所在目录。
 *
 * 支持格式：
 *   .har      HTTP Archive（Surge、Chrome、Charles、Reqable、Fiddler 导出）
 *   .json     Charles / Reqable 导出的 JSON 会话
 *   .chlsj    Charles Session（每行一个 JSON）
 *   .jsonl    同上
 *   .txt/.log 纯文本日志，按行提取 URL 与请求头
 *
 * 输出：
 *   抓包精简报告.txt   人类可读，可直接发给我
 *   抓包精简数据.json   结构化数据，便于程序填写接口配置
 */

'use strict';

var fs = require('fs');
var path = require('path');

var KEYWORDS = [
  'sign', 'checkin', 'check-in', 'check_in', 'qiandao', 'task', 'mission',
  'point', 'integral', 'score', 'daily', 'ling', 'coin', 'gold', 'award',
  'receive', 'reward', 'member', 'user', 'login', 'token', 'coupon',
  '00bang', 'sgmw', 'wuling', 'lingclub'
];

var STATIC_EXT = /\.(png|jpe?g|gif|webp|svg|ico|bmp|woff2?|ttf|eot|otf|mp4|mp3|m4a|avi|js|css|map|zip|apk|ipa)(\?|#|$)/i;

var SENSITIVE_KEY = /token|secret|authorization|cookie|session|password|passwd|pwd|ticket|signature|sign|nonce|access[_-]?key|client[_-]?secret|device|imei|vin|phone|mobile|idcard|openid|unionid|user[_-]?id|uid|plate/i;
var SENSITIVE_URL_PARAM = /^(access_token|accesstoken|token|ticket|session|sessionid|signature|sign|nonce|secret|code)$/i;

var MAX_ENTRIES = 80;
var MAX_TEXT = 2500;


function mask(v) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  if (!s) return '';
  if (/^Bearer\s+/i.test(s)) return 'Bearer ***MASKED***';
  return '***MASKED*** (' + s.length + ' chars)';
}

function scrubText(s) {
  if (!s) return '';
  return String(s)
    .replace(/1[3-9]\d{9}/g, '1**********')
    .replace(/\b[A-Za-z0-9_-]{9,}\.[A-Za-z0-9_-]{9,}\.[A-Za-z0-9_-]{9,}\b/g, '***JWT***')
    .replace(/\b[A-HJ-NPR-Z0-9]{17}\b/g, '***VIN***')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]{12,}/gi, '$1***TOKEN***')
    .replace(/(["']?(?:access_token|token|ticket|sessionid|session)["']?\s*[:=]\s*["'])([^"']{8,})(["'])/gi, '$1***MASKED***$3');
}

function scrubUrl(u) {
  if (!u) return '';
  try {
    var q = u.indexOf('?');
    if (q < 0) return scrubText(u);
    var base = u.substring(0, q);
    var parts = u.substring(q + 1).split('&').map(function (kv) {
      var i = kv.indexOf('=');
      var k = i < 0 ? kv : kv.substring(0, i);
      var v = i < 0 ? '' : kv.substring(i + 1);
      return SENSITIVE_URL_PARAM.test(k) ? k + '=***MASKED***' : k + '=' + scrubText(v);
    });
    return scrubText(base) + '?' + parts.join('&');
  } catch (e) { return scrubText(u); }
}

function scrubHeaders(headers) {
  var out = [];
  if (!headers) return out;
  if (Object.prototype.toString.call(headers) === '[object Array]') {
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i] || {};
      var n = h.name || h.field || h.key || '';
      var v = h.value !== undefined ? h.value : (h.val || '');
      out.push({ name: String(n), value: SENSITIVE_KEY.test(String(n)) ? mask(v) : scrubText(v) });
    }
  } else {
    for (var k in headers) {
      if (!Object.prototype.hasOwnProperty.call(headers, k)) continue;
      out.push({ name: k, value: SENSITIVE_KEY.test(k) ? mask(headers[k]) : scrubText(headers[k]) });
    }
  }
  return out;
}

function scrubBody(body) {
  if (!body) return '';
  var text = typeof body === 'string' ? body : JSON.stringify(body);
  try {
    var obj = JSON.parse(text);
    return JSON.stringify(scrubObject(obj), null, 2).substring(0, MAX_TEXT);
  } catch (e) {
    return scrubText(text).substring(0, MAX_TEXT);
  }
}

function scrubObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? scrubText(obj) : obj;
  }
  if (Object.prototype.toString.call(obj) === '[object Array]') {
    return obj.slice(0, 20).map(scrubObject);
  }
  var out = {};
  for (var k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    if (SENSITIVE_KEY.test(k) && typeof obj[k] !== 'object') out[k] = mask(obj[k]);
    else out[k] = scrubObject(obj[k]);
  }
  return out;
}

function normEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var req = raw.request || raw.req || raw.Request || {};
  var res = raw.response || raw.res || raw.Response || {};
  var url = req.url || req.URL || req.Url || raw.url || raw.URL || raw.host || '';
  var method = req.method || raw.method || raw.Method || 'GET';
  if (!url) return null;

  var reqBody = '';
  if (req.postData) reqBody = req.postData.text || req.postData.body || '';
  else if (req.body !== undefined) reqBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  else if (raw.requestBody) reqBody = raw.requestBody;

  var resBody = '';
  if (res.content) resBody = res.content.text || res.content.body || '';
  else if (res.body !== undefined) resBody = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
  else if (raw.responseBody) resBody = raw.responseBody;

  var status = res.status || res.statusCode || raw.status || raw.statusCode || 0;
  var mime = (res.content && res.content.mimeType) || res.mimeType || raw.mimeType || '';

  return {
    method: String(method).toUpperCase(),
    url: String(url),
    reqHeaders: scrubHeaders(req.headers || raw.requestHeaders || raw.headers),
    reqBody: scrubBody(reqBody),
    status: Number(status) || 0,
    mime: String(mime),
    resBody: scrubText(typeof resBody === 'string' ? resBody : JSON.stringify(resBody)).substring(0, MAX_TEXT)
  };
}

function parseFile(file, text) {
  var entries = [];
  var ext = path.extname(file).toLowerCase();

  if (ext === '.chlsj' || ext === '.jsonl') {
    text.split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      try { entries.push(JSON.parse(line)); } catch (e) {}
    });
    return entries;
  }

  if (ext === '.txt' || ext === '.log') {
    return text.split(/\r?\n/).map(function (line) {
      var m = /(https?:\/\/[^\s"'<>]+)/.exec(line);
      if (!m) return null;
      return { request: { url: m[1], method: /\bPOST\b/i.test(line) ? 'POST' : 'GET', headers: {} } };
    }).filter(Boolean);
  }

  try {
    var data = JSON.parse(text);
    if (data && data.log && data.log.entries) return data.log.entries;
    if (Object.prototype.toString.call(data) === '[object Array]') return data;
    if (data.entries) return data.entries;
    if (data.requests) return data.requests;
    if (data.sessions) return data.sessions;
    return [data];
  } catch (e) {
    var fallback = [];
    text.split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      try { fallback.push(JSON.parse(line)); } catch (e2) {}
    });
    return fallback;
  }
}

function isInteresting(e) {
  if (!e || !e.url) return false;
  if (STATIC_EXT.test(e.url)) return false;
  if (/^https?:\/\//i.test(e.url) === false && !(e.url.indexOf('/') === 0 || e.url.indexOf('http') === 0)) {
    // 仍保留相对路径，因为可能是 Charles 的 path-only 记录
  }
  var hay = (e.url + ' ' + e.reqBody).toLowerCase();
  for (var i = 0; i < KEYWORDS.length; i++) {
    if (hay.indexOf(KEYWORDS[i]) >= 0) return true;
  }
  return false;
}

function main() {
  var file = process.argv[2];
  if (!file) {
    console.log('用法：node extract-har.js "抓包文件路径" [输出目录]');
    console.log('例如：node extract-har.js "C:\\Users\\bpx\\Downloads\\wuling.har"');
    process.exit(1);
  }
  var abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.log('找不到文件：' + abs);
    process.exit(1);
  }
  var stat = fs.statSync(abs);
  var text = fs.readFileSync(abs, 'utf8');
  console.log('读取文件：' + abs);
  console.log('原始大小：' + (stat.size / 1024 / 1024).toFixed(2) + ' MB');

  var rawList = parseFile(abs, text);
  console.log('解析到请求：' + rawList.length + ' 条');

  var all = [];
  for (var i = 0; i < rawList.length; i++) {
    var e = normEntry(rawList[i]);
    if (e) all.push(e);
  }

  var hits = all.filter(isInteresting);
  if (hits.length > MAX_ENTRIES) hits = hits.slice(0, MAX_ENTRIES);
  console.log('命中关键请求：' + hits.length + ' 条（已脱敏）');

  var outDir = process.argv[3] ? path.resolve(process.argv[3]) : path.dirname(abs);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  var lines = [];
  lines.push('五菱签到 · 抓包精简报告');
  lines.push('来源文件：' + path.basename(abs));
  lines.push('生成时间：' + new Date().toLocaleString('zh-CN'));
  lines.push('原始大小：' + (stat.size / 1024 / 1024).toFixed(2) + ' MB，共 ' + all.length + ' 条请求，筛出 ' + hits.length + ' 条');
  lines.push('说明：token / Cookie / 手机号 / 车架号已自动打码，本报告可安全传输。');
  lines.push('============================================================');

  hits.forEach(function (e, idx) {
    lines.push('');
    lines.push('【' + (idx + 1) + '】' + e.method + '  ' + (e.status || '-') + '  ' + scrubUrl(e.url));
    if (e.mime) lines.push('响应类型：' + e.mime);
    if (e.reqHeaders.length) {
      lines.push('请求头：');
      e.reqHeaders.forEach(function (h) { lines.push('  ' + h.name + ': ' + h.value); });
    }
    if (e.reqBody) lines.push('请求体：\n' + e.reqBody);
    if (e.resBody) lines.push('响应体：\n' + e.resBody);
  });

  lines.push('');
  lines.push('============================================================');
  lines.push('把本文件发给我即可，不需要发原始抓包。');

  var txtPath = path.join(outDir, '抓包精简报告.txt');
  var jsonPath = path.join(outDir, '抓包精简数据.json');
  fs.writeFileSync(txtPath, lines.join('\n'), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify({ source: path.basename(abs), total: all.length, entries: hits }, null, 2), 'utf8');

  console.log('已输出：' + txtPath + '（' + (fs.statSync(txtPath).size / 1024).toFixed(1) + ' KB）');
  console.log('已输出：' + jsonPath + '（' + (fs.statSync(jsonPath).size / 1024).toFixed(1) + ' KB）');
}

main();
