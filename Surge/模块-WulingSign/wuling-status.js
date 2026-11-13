/*
 * 五菱汽车 · 状态查看（手动运行）
 * 触发类型：generic
 *
 * 用法：Surge iOS「脚本」页长按「wuling-status」→ 运行，结果用系统通知弹出。
 * 快捷指令调用时可传参数：
 *   reset = 清除当天成功标记（强制重跑一次签到）
 *   clear = 清空已保存的凭证（重新抓）
 *   probe = 把侦察日志打到 Surge 日志里，方便复制给我定位接口
 */

var KEY_CRED = 'wuling_cred_v1';
var KEY_CRED_TIME = 'wuling_cred_time_v1';
var KEY_PROBE = 'wuling_probe_v1';
var KEY_DAY = 'wuling_day_v1';
var KEY_TASK = 'wuling_task_v1';
var KEY_LOG = 'wuling_sign_log_v1';


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

(function main() {
  var arg = String($argument || '').trim().toLowerCase();

  if (arg === 'reset') {
    write(KEY_DAY, JSON.stringify({ date: today(), ok: false, detail: ['手动重置'], ts: Date.now() }));
    write(KEY_TASK, JSON.stringify({ date: today(), done: {} }));
    try { $notification.post('五菱 · 已重置', '当天成功标记已清除', '下一次定时触发会重新跑一遍签到与任务。'); } catch (e) {}
    console.log('[五菱·状态] 已重置当天标记');
    $done(); return;
  }

  if (arg === 'clear') {
    write(KEY_CRED, '');
    write(KEY_CRED_TIME, '');
    try { $notification.post('五菱 · 凭证已清空', '请重新登录一次', '打开五菱汽车 App 或小程序，模块会自动重新抓取。'); } catch (e) {}
    console.log('[五菱·状态] 凭证已清空');
    $done(); return;
  }

  var cred = readJSON(KEY_CRED, null);
  var credTime = read(KEY_CRED_TIME) || '未知';
  var probe = readJSON(KEY_PROBE, []);
  if (!(probe instanceof Array)) probe = [];
  var logs = readJSON(KEY_LOG, []);
  if (!(logs instanceof Array)) logs = [];
  var day = readJSON(KEY_DAY, {});
  var task = readJSON(KEY_TASK, {});
  var doneCount = task.done ? Object.keys(task.done).length : 0;

  var lines = [];
  var hasCred = !!(cred && cred.form && cred.form.originalToken && cred.form.userIdStr);
  lines.push('凭证：' + (hasCred ? '已抓到' : '未抓到'));
  if (cred && cred.host) lines.push('来源域名：' + cred.host);
  lines.push('表单凭证：' + (cred && cred.form ? Object.keys(cred.form).join(', ') : '无'));
  lines.push('请求头：' + (cred && cred.headers ? Object.keys(cred.headers).join(', ') : '无'));
  lines.push('抓取时间：' + credTime);
  lines.push('今日签到：' + (day.date === today() ? (day.ok ? '已完成' : '未完成，等待补跑') : '尚未执行'));
  lines.push('今日任务：已完成 ' + doneCount + ' 项');
  lines.push('侦察记录：' + probe.length + ' 条（发 probe 参数可输出到日志）');

  if (arg === 'probe') {
    console.log('===== 五菱 · 接口侦察日志（已脱敏，可直接复制） =====');
    for (var i = 0; i < probe.length; i++) console.log(probe[i]);
    console.log('===== 侦察日志结束 =====');
  }

  var recent = logs.slice(-4);
  if (recent.length) lines.push('最近记录：\n' + recent.join('\n'));

  var body = lines.join('\n');
  console.log('[五菱·状态]\n' + body);
  try {
    $notification.post('五菱 · 状态',
      (hasCred ? '凭证已就绪' : '等待首次抓凭证'),
      body.substring(0, 900));
  } catch (e) {}

  $done();
})();
