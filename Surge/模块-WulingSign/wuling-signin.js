/*
 * 五菱汽车 · 每日签到与做任务
 * 触发类型：cron（每天多次触发，靠「本地当天锁 + 服务端 date_his」双重幂等）
 *
 * 接口来自 2026-11-11 的 Surge iOS 抓包分析，域名 operation.wuling.com：
 *   POST /sign2023/api/info          查询签到状态（只认 date_his，cur/max 不可靠）
 *   POST /sign2023/api/sign          执行签到（无额外参数）
 *   POST /task2021/api/task-list     每日任务列表（daily[].can_pick_num）
 *   POST /task2021/api/get-point     领取任务积分（taskid + logid + 极验参数）
 *
 * 请求体统一为 form-urlencoded：
 *   scene=&originalToken={originalToken}&userIdStr={userIdStr}
 * 两个花括号占位符由 wuling-capture.js 抓到的凭证自动填充，不需要手工抄。
 *
 * 2026-11-12 抓包补充：App 原生签到走 api.00bang.cn/llb/account/signIn，
 * 请求与响应都是加密 sd，且带 signature / nonce / timestamp 签名，纯脚本无法复刻；
 * 所以仍用 H5 明文接口。但 /sign2023/api/sign 至今没被真实抓到过
 * （App 启动瞬间就自动签到了），因此每次签到后回查 info 的 date_his 自证生效，
 * 避免「接口返回成功、实际日历没更新」的静默失败。
 *
 * 已知限制：get-point 带极验风控参数。若服务端要求滑块验证，该笔会返回失败，
 * 模块只做记录并提醒你手动领取，不会伪造验证结果。
 */

var FORM_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Accept': 'application/json; charset=utf-8',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': 'https://operation.wuling.com',
  'Referer': 'https://operation.wuling.com/task2021/index'
};

var FORM_BODY = 'scene=&originalToken={originalToken}&userIdStr={userIdStr}';
var PICK_BODY = 'scene=&originalToken={originalToken}&userIdStr={userIdStr}' +
  '&taskid={taskid}&logid={logid}' +
  '&lot_number=&captcha_output=&pass_token=&gen_time=&gee_token=';

var CONFIG = {
  // ============ 接口配置区：接口变更时只改这一段 ============
  baseUrl: 'https://operation.wuling.com',

  status:    { name: '签到状态', method: 'POST', path: '/sign2023/api/info',      headers: FORM_HEADERS, body: FORM_BODY },
  signIn:    { name: '每日签到', method: 'POST', path: '/sign2023/api/sign',      headers: FORM_HEADERS, body: FORM_BODY },
  taskList:  { name: '任务列表', method: 'POST', path: '/task2021/api/task-list', headers: FORM_HEADERS, body: FORM_BODY },
  pickPoint: { name: '领取积分', method: 'POST', path: '/task2021/api/get-point', headers: FORM_HEADERS, body: PICK_BODY },

  // 是否自动领取「服务端判定可领」的任务积分（不会伪造任务完成行为）
  autoPickTasks: true,

  // 返回体里代表成功的 errcode
  okCodes: [0, '0', 200, '200', '0000'],
  // 代表凭证失效的值
  authCodes: [401, 403, '401', '403', '10001', '10002', 'TOKEN_INVALID', 'TOKEN_EXPIRED', 'NOT_LOGIN'],
  // 命中这些字样按「已经做过」处理
  alreadyKeywords: ['已签到', '已打卡', '今日已签', '重复', '已完成', '已领取', 'already', 'repeat'],
  // 命中这些字样按「需要人工验证」处理
  captchaKeywords: ['验证', 'captcha', '滑块', '风控', 'gee', '安全'],

  timeout: 15,
  credSoftExpireDays: 20
  // =========================================================
};

/* Surge 模块参数：Host=...&AutoPick=...，在模块设置里改，无需编辑代码 */
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
if (ARGS.Host) {
  var hostArg = String(ARGS.Host).replace(/^https?:\/\//i, '').replace(/\/$/, '');
  CONFIG.baseUrl = 'https://' + hostArg;
  FORM_HEADERS.Origin = CONFIG.baseUrl;
  FORM_HEADERS.Referer = CONFIG.baseUrl + '/task2021/index';
}
if (ARGS.AutoPick !== undefined && /^(0|false|no|off)$/i.test(String(ARGS.AutoPick))) {
  CONFIG.autoPickTasks = false;
}

var KEY_CRED = 'wuling_cred_v1';
var KEY_CRED_TIME = 'wuling_cred_time_v1';
var KEY_DAY = 'wuling_day_v1';
var KEY_TASK = 'wuling_task_v1';
var KEY_LOG = 'wuling_sign_log_v1';
var KEY_AUTH_NOTIFY = 'wuling_auth_notify_v1';

var HEADER_CASE = {
  'authorization': 'Authorization', 'llbtoken': 'llbtoken', 'appid': 'appid',
  'cookie': 'Cookie', 'x-requested-with': 'X-Requested-With',
  'accept': 'Accept', 'origin': 'Origin', 'referer': 'Referer',
  'user-agent': 'User-Agent'
};

var DEFAULT_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';


function log(m) { console.log('[五菱·签到] ' + m); }

function read(k) {
  try { return $persistentStore.read(k); } catch (e) { return null; }
}

function write(k, v) {
  try { return $persistentStore.write(String(v), k); } catch (e) { return false; }
}

function readJSON(k, fallback) {
  var raw = read(k);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

function today() {
  var d = new Date();
  function p(n) { return n < 10 ? '0' + n : '' + n; }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function stamp() {
  var d = new Date();
  function p(n) { return n < 10 ? '0' + n : '' + n; }
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function addLog(text) {
  var list = readJSON(KEY_LOG, []);
  if (!(list instanceof Array)) list = [];
  list.push(stamp() + ' ' + text);
  if (list.length > 20) list = list.slice(list.length - 20);
  write(KEY_LOG, JSON.stringify(list));
  log(text);
}

function notify(title, sub, body) {
  try { $notification.post(title, sub, body); } catch (e) { log('通知不可用'); }
}

function inList(code, list) {
  for (var i = 0; i < list.length; i++) {
    if (String(code) === String(list[i])) return true;
  }
  return false;
}

function matchAny(text, list) {
  if (!text) return false;
  var s = String(text).toLowerCase();
  for (var i = 0; i < list.length; i++) {
    if (s.indexOf(String(list[i]).toLowerCase()) >= 0) return true;
  }
  return false;
}

function headerName(k) {
  if (HEADER_CASE[k]) return HEADER_CASE[k];
  var parts = k.split('-'), out = [];
  for (var i = 0; i < parts.length; i++) {
    out.push(parts[i].charAt(0).toUpperCase() + parts[i].slice(1));
  }
  return out.join('-');
}

function hasHeader(headers, name) {
  var k;
  for (k in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, k) && k.toLowerCase() === name.toLowerCase()) return true;
  }
  return false;
}

function renderBody(tpl, cred, extra) {
  if (!tpl) return '';
  if (typeof tpl !== 'string') tpl = JSON.stringify(tpl);
  return tpl.replace(/\{(\w+)\}/g, function (m, key) {
    var v = '';
    if (extra && extra[key] !== undefined && extra[key] !== null) v = String(extra[key]);
    else if (cred && cred.form && cred.form[key] !== undefined) v = String(cred.form[key]);
    else if (cred && cred.query && cred.query[key] !== undefined) v = String(cred.query[key]);
    return encodeURIComponent(v);
  });
}

function parseJSON(data) {
  if (!data) return null;
  if (typeof data === 'object') return data;
  try { return JSON.parse(data); } catch (e) { return null; }
}

function messageOf(json, raw) {
  if (json) {
    var m = json.msg || json.message || json.errMsg || json.resultMsg;
    if (m) return String(m);
  }
  return String(raw || '').substring(0, 120);
}

/* cb(errType, result)：errType 为 null 表示成功，'auth' 表示凭证失效 */
function call(opt, cred, extra, cb) {
  var url = /^https?:\/\//i.test(opt.path || '') ? opt.path : String(CONFIG.baseUrl).replace(/\/$/, '') + (opt.path || '');
  var headers = {}, k, v;

  var saved = (cred && cred.headers) || {};
  for (k in saved) {
    if (!Object.prototype.hasOwnProperty.call(saved, k)) continue;
    v = saved[k];
    if (v === '' || v === null || v === undefined) continue;
    headers[headerName(k)] = String(v);
  }
  var fixed = opt.headers || {};
  for (k in fixed) {
    if (Object.prototype.hasOwnProperty.call(fixed, k)) headers[k] = fixed[k];
  }
  if (!hasHeader(headers, 'User-Agent')) headers['User-Agent'] = DEFAULT_UA;

  var options = {
    url: url,
    headers: headers,
    timeout: CONFIG.timeout,
    body: renderBody(opt.body, cred, extra || {})
  };

  var method = String(opt.method || 'POST').toLowerCase();
  var fn = $httpClient.post;
  if (method === 'get') fn = $httpClient.get;
  else if (method === 'put') fn = $httpClient.put;
  else if (method === 'delete') fn = $httpClient.delete;
  else if (method === 'patch') fn = $httpClient.patch;

  try {
    fn.call($httpClient, options, function (error, response, data) {
      if (error) { cb('network', { msg: '网络失败 ' + error }); return; }
      var status = response && response.status ? response.status : 0;
      var raw = typeof data === 'string' ? data : (data ? String(data) : '');
      var json = parseJSON(raw);
      var code = null;
      if (json && json.errcode !== undefined) code = json.errcode;
      else if (json && json.code !== undefined) code = json.code;
      var msg = messageOf(json, raw);
      var result = { status: status, code: code, msg: msg, json: json, raw: raw.substring(0, 300) };

      if (status === 401 || status === 403 || inList(code, CONFIG.authCodes) ||
          (json && json.isLogin === false)) { cb('auth', result); return; }
      if (status >= 400) { cb('http', result); return; }
      if (matchAny(msg, CONFIG.alreadyKeywords)) { cb(null, result); return; }
      if (json && json.success === false) { cb('biz', result); return; }
      if (code !== null && !inList(code, CONFIG.okCodes)) { cb('code', result); return; }
      cb(null, result);
    });
  } catch (e) {
    cb('network', { msg: '请求异常 ' + e });
  }
}

function alreadySigned(json) {
  try {
    var sd = json.result.signData || {};
    var his = sd.date_his || [];
    var d = today(), i;
    for (i = 0; i < his.length; i++) {
      if (String(his[i]).indexOf(d) === 0) return true;
    }
    // 2026-11-12 实测：cur_sign_count 与 max_sign_count 在本月连续签到时始终相等
    // （11-11 为 1/1，11-12 为 2/2），它们记录的是累计天数，不能用来判断今天是否已签。
    // 唯一可靠依据是 date_his 是否包含今天。
  } catch (e) {}
  return false;
}

function authFailed(cred, msg) {
  write(KEY_DAY, JSON.stringify({ date: today(), ok: false, detail: ['凭证失效'], ts: Date.now() }));
  write(KEY_TASK, JSON.stringify({ date: today(), done: {} }));
  var last = parseInt(read(KEY_AUTH_NOTIFY) || '0', 10);
  if (isNaN(last)) last = 0;
  if (Date.now() - last > 60 * 60 * 1000) {
    write(KEY_AUTH_NOTIFY, String(Date.now()));
    notify('五菱 · 凭证已过期', '需要你操作一次',
      '请打开五菱汽车 App 的签到/任务中心并登录，模块会自动重新抓取凭证。' + (msg ? '（' + msg + '）' : ''));
  }
  addLog('凭证失效，等待重新登录');
}

(function main() {
  var day = today();
  var state = readJSON(KEY_DAY, { date: '', ok: false });
  var cred = readJSON(KEY_CRED, null);
  var summary = [];
  var silent = false;
  var needNotify = false;

  if (!cred || !cred.form || !cred.form.originalToken || !cred.form.userIdStr) {
    addLog('凭证不完整，跳过');
    notify('五菱 · 还没有凭证', '请操作一次',
      '打开五菱汽车 App 的签到/任务中心页面并登录，模块会自动抓取凭证。');
    $done(); return;
  }

  if (CONFIG.credSoftExpireDays > 0 && cred.ts) {
    var age = (Date.now() - cred.ts) / 86400000;
    if (age > CONFIG.credSoftExpireDays) log('凭证已 ' + Math.floor(age) + ' 天未更新');
  }

  var tstate = readJSON(KEY_TASK, {});
  if (tstate.date !== day || !tstate.done) tstate = { date: day, done: {} };

  function finish() {
    if (needNotify && !silent) {
      notify('五菱 · 今日签到', day, summary.join('\n').substring(0, 800) || '检查完成');
    }
    addLog('本轮：' + summary.join(' | ').substring(0, 240));
    $done();
  }

  function runPick(list, idx) {
    if (idx >= list.length) { write(KEY_TASK, JSON.stringify(tstate)); finish(); return; }
    var t = list[idx];
    var key = 'task_' + t.taskid;
    var extra = { taskid: t.taskid === undefined ? '' : t.taskid, logid: t.logid || '' };
    call(CONFIG.pickPoint, cred, extra, function (err, res) {
      if (err === 'auth') { authFailed(cred, res.msg); $done(); return; }
      var name = String(t.name || key);
      if (!err) {
        tstate.done[key] = true;
        summary.push(name + '：已领取');
        addLog(name + ' 领取成功');
      } else if (matchAny(res.msg, CONFIG.captchaKeywords)) {
        summary.push(name + '：需要验证码，请手动领取');
        needNotify = true;
        addLog(name + ' 触发验证码');
      } else {
        summary.push(name + '：失败 ' + String(res.msg).substring(0, 40));
        needNotify = true;
      }
      write(KEY_TASK, JSON.stringify(tstate));
      runPick(list, idx + 1);
    });
  }

  function runTasks() {
    if (!CONFIG.autoPickTasks) { finish(); return; }
    call(CONFIG.taskList, cred, {}, function (err, res) {
      if (err === 'auth') { authFailed(cred, res.msg); $done(); return; }
      if (err) { summary.push('任务列表查询失败：' + res.msg); needNotify = true; finish(); return; }

      var list = [], r = (res.json && res.json.result) || {};
      var groups = ['daily', 'novice', 'normal', 'other', 'list', 'tasks'];
      for (var g = 0; g < groups.length; g++) {
        if (r[groups[g]] instanceof Array) list = list.concat(r[groups[g]]);
      }
      var pending = [], i;
      for (i = 0; i < list.length; i++) {
        var t = list[i] || {};
        var canPick = (Number(t.can_pick_num) || 0) > 0 ||
          (Number(t.state) === 1 && (Number(t.can_pick_points) || 0) > 0);
        if (!canPick) continue;
        if (tstate.done['task_' + t.taskid]) continue;
        pending.push(t);
      }
      if (!pending.length) { summary.push('任务：暂无可自动领取项'); finish(); return; }
      runPick(pending, 0);
    });
  }

  // 本地当天锁：已成功则不再签到，只检查任务（静默）
  if (state.date === day && state.ok) {
    silent = true;
    summary.push('签到：今天已完成');
    runTasks();
    return;
  }

  needNotify = true;

  call(CONFIG.status, cred, {}, function (err, res) {
    if (err === 'auth') { authFailed(cred, res.msg); $done(); return; }
    if (!err && alreadySigned(res.json)) {
      write(KEY_DAY, JSON.stringify({ date: day, ok: true, detail: ['服务端显示已签到'], ts: Date.now() }));
      summary.push('签到：服务端显示今天已签到');
      runTasks();
      return;
    }

    call(CONFIG.signIn, cred, {}, function (err2, res2) {
      if (err2 === 'auth') { authFailed(cred, res2.msg); $done(); return; }
      if (err2) {
        write(KEY_DAY, JSON.stringify({ date: day, ok: false, detail: [res2.msg], ts: Date.now() }));
        summary.push('签到失败：' + String(res2.msg).substring(0, 60) + '，稍后自动补跑');
        addLog('签到失败：' + res2.msg);
        finish();
        return;
      }
      // 回查自证：sign 接口从未被真实抓包验证过，只认服务端 date_his
      call(CONFIG.status, cred, {}, function (err3, res3) {
        if (err3 === 'auth') { authFailed(cred, res3.msg); $done(); return; }
        if (err3) {
          write(KEY_DAY, JSON.stringify({ date: day, ok: false, detail: ['回查失败，稍后补跑'], ts: Date.now() }));
          summary.push('签到已提交，但状态回查失败，稍后自动补跑');
          addLog('签到回查失败：' + res3.msg);
          runTasks();
          return;
        }
        if (alreadySigned(res3.json)) {
          write(KEY_DAY, JSON.stringify({ date: day, ok: true, detail: ['签到成功并已回查确认'], ts: Date.now() }));
          summary.push('签到：成功（date_his 已确认）');
          addLog('签到成功并经 info 回查确认');
        } else {
          write(KEY_DAY, JSON.stringify({ date: day, ok: false, detail: ['sign 返回成功但 date_his 未更新'], ts: Date.now() }));
          summary.push('签到未生效：接口返回成功但日历未更新，请检查接口');
          addLog('签到未生效：sign 返回成功但 date_his 未更新');
        }
        runTasks();
      });
    });
  });
})();
