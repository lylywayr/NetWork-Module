/*
 * 今日水印相机 —— VIP 权益解锁（响应侧）
 *
 * 目标接口（3.0.5xx / 2026-11 脱壳包确认）：
 *   /next/app/vip/info              会员信息（服务端加密的 result 密文）
 *   /next/app/h5/vip/info           H5 会员页
 *   /next/app/h5/vip/rollup/v2      会员权益汇总
 *   /next/app/remove/watermark/counts 去水印次数
 *   /next/app/order/apple/receipts  苹果内购校验（不改，只记录）
 *
 * 说明：这些接口的真实响应是 {"code":..,"result":"<base64 密文>"}，密文由 App 本地解密，
 * 社区 2023 年抓到的两段密文（vip/info 240 字节、counts 72 字节）就是整段替换用的。
 * 本脚本先原样回放这两段密文（Replay=1），同时把真实密文打进脚本日志，便于密钥轮换后离线分析。
 *
 * 参数：
 *   Replay  1=回放已知会员密文；0=只记录不改写（默认 1）
 *   Debug   1=输出 [XHVIP] 日志（默认 1）
 */

var ARG = {};
try {
  if (typeof $argument !== 'undefined' && $argument) {
    ARG = (typeof $argument === 'string') ? JSON.parse($argument) : $argument;
  }
} catch (e) { ARG = {}; }
var REPLAY = String(ARG.Replay === undefined ? 1 : ARG.Replay) !== '0';
var DEBUG = String(ARG.Debug === undefined ? 1 : ARG.Debug) !== '0';

var VIP_BLOB = "bncdzrxa+Dq49i7NxArtSeZtLpZ7cxsOynuCD5Co47mgXj5V8wuwHKrBZk6XMBm14RbGudMdnG9/bN5HYEawsYzr4IJtgtQeWEXeLX+5qSlN9uDunZC4Il0PpaxdeEaYm4TemFHyNAcFl6A+0LgQv/jmaZGldDdypZEYBC8Xm45u8HSvDEPsIoPk8CXEWpXBLJvSfsZ+3ryV87nwgLjZGjR301rTrcvAmuC8gr3p3tU2KOawe5xnH9sNYfeg2Vk1wwtltF6LObXU+CNxqqDTj4EKvbOxGrqB4R/ZZ8wNs/94joVG1o3cf5hydFNgulEN";
var COUNT_BLOB = "bncdzrxa+Dq49i7NxArtSeZtLpZ7cxsOynuCD5Co47mgXj5V8wuwHKrBZk6XMBm14RbGudMdnG9/bN5HYEawsXsCvH1uPZ0Jc36U0ZeSQ7s=";

function log() {
  if (!DEBUG) return;
  try { console.log('[XHVIP] ' + Array.prototype.slice.call(arguments).join(' ')); } catch (e) {}
}

function parse(text) {
  try { var o = JSON.parse(text); return (o && typeof o === 'object') ? o : null; } catch (e) { return null; }
}

var url = ($request && $request.url) || '';
var body = ($response && $response.body) || null;

function itemCtx(path) {
  if (path.length < 2) return false;
  var last = path[path.length - 1];
  if (!/^\d+$/.test(last)) return false;
  return /(templates?|items?|list|goods|products|privileges?|benefits?)/i.test(path[path.length - 2]);
}

var VIP_KEYS = /^(vip|is_?vip|svip|member|is_?member|vip_?type|vip_?status)$/i;
var TIME_KEYS = /(vip_?expire|vip_?end|expire_?time|expiry)/i;
var AD_KEYS = /^(ads?|ad_?list|banner|banners|splash)$/i;
var ITEM_LOCK = /^(is_?vip|vip|need_?vip|locked|is_?lock|is_?pay|price|vip_?price)$/i;
var changed = 0;

function walk(node, path) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (var i = 0; i < node.length; i++) walk(node[i], path.concat(String(i))); return; }
  var inItem = itemCtx(path);
  for (var k in node) {
    if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
    var v = node[k], p = path.concat(k);
    if (AD_KEYS.test(k) && Array.isArray(v)) { node[k] = []; changed++; continue; }
    if (v && typeof v === 'object') { walk(v, p); continue; }
    if (inItem) {
      if (ITEM_LOCK.test(k)) {
        var usable = /^(can_?use|usable|unlocked)$/i.test(k);
        if (typeof v === 'boolean') { node[k] = usable; changed++; }
        else if (typeof v === 'number') { node[k] = usable ? 1 : 0; changed++; }
        else if (typeof v === 'string' && /price|pay/i.test(k)) { node[k] = '0'; changed++; }
      }
      continue;
    }
    if (VIP_KEYS.test(k) && (typeof v === 'number' || typeof v === 'boolean')) {
      node[k] = typeof v === 'boolean' ? true : 1; changed++;
    } else if (TIME_KEYS.test(k) && typeof v === 'number') {
      node[k] = 4102415999; changed++;
    }
  }
}

function main() {
  log('hit ' + url + ' bodyLen=' + (body ? body.length : 0));
  if (!body) return $done({});

  var obj = parse(body);
  if (!obj) { log('not json, skip'); return $done({}); }

  var isVip = /\/app\/(?:vip\/info|h5\/vip\/(?:info|rollup\/v2))/i.test(url);
  var isCounts = /\/app\/remove\/watermark\/counts/i.test(url);

  if (typeof obj.result === 'string') {
    log('cipher len=' + obj.result.length + ' head=' + obj.result.slice(0, 24));
    if (REPLAY && isVip) { obj.result = VIP_BLOB; log('vip result <- known blob'); }
    else if (REPLAY && isCounts) { obj.result = COUNT_BLOB; log('counts result <- known blob'); }
    return $done({ body: JSON.stringify(obj) });
  }

  if (!REPLAY) return $done({});

  walk(obj, []);
  log('plaintext walk changed=' + changed);
  return $done({ body: JSON.stringify(obj) });
}

main();
