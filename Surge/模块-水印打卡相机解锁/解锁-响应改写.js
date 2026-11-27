/*
 * 水印打卡相机 / 同源白牌相机 —— 会员解锁 + 广告位清空
 *
 * 适配：com.laoyapi.waterfv（水印打卡相机）
 *       com.xiangji.super（水印打卡相机 · 打卡记录）
 *       以及共用 ThinkPHP /api/visitors/* 后端的同源 App
 *
 * 上游参考：89996462/Quantumult-X jslynhapi.js、1yifanxinmei.js；afengye/QX syxj*.js
 * 本版差异：不再用正则匹配固定字段，改为按容器语义递归改写——
 *           用户态容器里的 vip 置真、模板列表里的 vip 置零（解锁模板）、广告容器清空。
 *           不同版本的字段名（vip / is_vip / member / vip_end_time …）都能覆盖。
 *
 * 调试：Surge → 脚本日志里过滤 [WMC] 可见命中路径。
 */

const VIP_EXPIRE = 4102415999; // 2099-12-31 23:59:59
const DEBUG = true;

const USER_KEYS = /^(vip|is_?vip|vip_?status|vip_?state|vip_?type|is_?vip_?user|member|is_?member|svip)$/i;
const TIME_KEYS = /^(vip_?expire_?time|vip_?expire|vip_?expires|vip_?end_?time|vip_?expire_?date|expire_?time|expiry_?time|vip_?deadline)$/i;
const LIFE_KEYS = /^(is_?lifetime(_?membership)?|lifetime|forever)$/i;
const ITEM_LOCK_KEYS = /^(is_?vip|vip|need_?vip|vip_?only|is_?lock|locked|lock|is_?pay|need_?pay|pay|can_?use|usable|unlocked|is_?free)$/i;
const PRICE_KEYS = /^(price|vip_?price|pay_?price|coin|coins|money|amount|fee|vip_?coin)$/i;
const AD_KEYS = /^(ads?|ad_?list|adlist|adverts?|banner|banners|splash|splash_?ad|ad_?info|ad_?config|ad_?data|ad_?show)$/i;
const AD_FLAG_KEYS = /^(has_?ad|show_?ad|is_?ad|ad_?enabled|ad_?switch|enable_?ad|open_?ad)$/i;
const ITEM_CTX = /(templates?|template_?list|items?|goods|products|materials?|stickers?|fonts?|frames?|skins?|styles?|themes?|resources?|list)/i;

function log() {
  if (!DEBUG) return;
  try { console.log('[WMC] ' + Array.prototype.slice.call(arguments).join(' ')); } catch (e) {}
}

function isEmpty(v) {
  return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
}

// 判断当前对象的 key 是不是「模板/商品列表里的一个条目」
function inItemContext(keyPath) {
  if (!keyPath.length) return false;
  const last = keyPath[keyPath.length - 1];
  if (!/^\d+$/.test(last)) return false; // 必须是数组下标
  const parent = keyPath[keyPath.length - 2] || '';
  return ITEM_CTX.test(parent);
}

function walk(node, keyPath, stats) {
  if (node === null || typeof node !== 'object') return node;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) walk(node[i], keyPath.concat(String(i)), stats);
    return node;
  }

  const itemCtx = inItemContext(keyPath);
  const userCtx = !itemCtx;

  for (const key of Object.keys(node)) {
    const val = node[key];
    const p = keyPath.concat(key);

    // 广告容器：数组置空，对象置空，开关置假
    if (AD_KEYS.test(key)) {
      if (Array.isArray(node[key])) { node[key] = []; stats.ads++; continue; }
      if (node[key] && typeof node[key] === 'object') { node[key] = {}; stats.ads++; continue; }
    }
    if (AD_FLAG_KEYS.test(key) && (typeof val === 'number' || typeof val === 'boolean')) {
      node[key] = typeof val === 'boolean' ? false : 0;
      stats.ads++;
      continue;
    }

    if (typeof val === 'object' && val !== null) {
      walk(val, p, stats);
      continue;
    }

    // 用户态会员字段
    if (userCtx && USER_KEYS.test(key) && (typeof val === 'number' || typeof val === 'boolean')) {
      node[key] = typeof val === 'boolean' ? true : 1;
      log('vip<-1', p.join('.'));
      stats.vip++;
      continue;
    }
    if (userCtx && TIME_KEYS.test(key) && typeof val === 'number') {
      node[key] = VIP_EXPIRE;
      log('time<-2099', p.join('.'));
      stats.time++;
      continue;
    }
    if (userCtx && LIFE_KEYS.test(key) && (typeof val === 'boolean' || typeof val === 'number')) {
      node[key] = typeof val === 'boolean' ? true : 1;
      log('lifetime<-true', p.join('.'));
      stats.vip++;
      continue;
    }

    // 模板条目：去掉会员锁
    if (itemCtx && ITEM_LOCK_KEYS.test(key)) {
      const usable = /^(can_?use|usable|unlocked|is_?free)$/i.test(key);
      if (typeof val === 'boolean') node[key] = usable;
      else node[key] = usable ? 1 : 0;
      log('tpl-unlock', p.join('.'), '->', String(node[key]));
      stats.tpl++;
      continue;
    }

    // 模板条目：价格归零
    if (itemCtx && PRICE_KEYS.test(key) && !isEmpty(val)) {
      node[key] = typeof val === 'number' ? 0 : '0';
      stats.tpl++;
      continue;
    }
  }
  return node;
}

try {
  let body = (typeof $response !== 'undefined' && $response.body) ? $response.body : null;
  if (!body) { log('empty body, skip'); $done({}); }

  let obj;
  try { obj = JSON.parse(body); }
  catch (e) { log('not json, skip:', String(e).slice(0, 60)); $done({}); }

  const stats = { vip: 0, time: 0, tpl: 0, ads: 0 };
  walk(obj, [], stats);

  // 有些版本把 data 再包一层 JSON 字符串
  if (obj && typeof obj.data === 'string') {
    const s = obj.data.trim();
    if (s.charAt(0) === '{' || s.charAt(0) === '[') {
      try {
        const inner = JSON.parse(s);
        walk(inner, ['data'], stats);
        obj.data = JSON.stringify(inner);
      } catch (e) {}
    }
  }

  log('host=' + ($request && $request.url || '?') + ' => vip=' + stats.vip + ' time=' + stats.time + ' tpl=' + stats.tpl + ' ads=' + stats.ads);

  $done({ body: JSON.stringify(obj) });
} catch (e) {
  log('error:', String(e));
  $done({});
}
