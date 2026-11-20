/**
 * 苹果内购 / 订阅 通用解锁脚本（Surge http-response）
 * ---------------------------------------------------------------
 * 作用：把 App「服务端下发的购买状态」改写成"已购买/已解锁"。
 *   1) verifyReceipt：把苹果返回的 status 21007/21002 等改成 0，并补 latest_receipt_info
 *   2) 普通 JSON：按字段语义把用户态标记（is_vip / purchased / premium…）改成 true
 *      把到期时间推到 2099 年，把商品列表里的锁/价格去掉
 *   3) 支持双层编码（body 是 JSON 字符串、或 base64 包了一层 JSON）
 *
 * 模块参数（$argument，JSON）：
 *   {
 *     "debug": false,                       // true 时打印改写明细到日志
 *     "products": [],                       // 需要"已拥有"的内购商品 ID
 *     "hosts": [],                           // 仅处理这些域名（空 = 全部）
 *     "paths": [],                           // 仅处理命中这些关键字的路径（空 = 全部）
 *     "preserve": []                         // 不要改写的字段名（优先级最高）
 *   }
 *
 * 注意：只能改「网络响应」。StoreKit 2 的本地 JWS 验签、以及服务端严格校验收据的场景，
 *       光靠网络改写无法通过——那需要越狱 hook 或真正的收据签名。
 */

const CFG = (() => {
  try { return JSON.parse($argument || "{}") || {}; } catch (e) { return {}; }
})();
const DEBUG = !!CFG.debug;
const HOSTS = Array.isArray(CFG.hosts) ? CFG.hosts.map(String) : [];
const PATHS = Array.isArray(CFG.paths) ? CFG.paths.map(String) : [];
const PRODUCTS = Array.isArray(CFG.products) ? CFG.products.map(String) : [];
const norm = (s) => String(s).toLowerCase().replace(/[_-]/g, "");
const PRESERVE = new Set((Array.isArray(CFG.preserve) ? CFG.preserve : []).map(norm));

// 用户态：账号/用户是否已购买（整个对象级别的布尔或 0/1）
const USER_TRUE = /^(is[_-]?vip|isvip|vip|svip|is[_-]?svip|is[_-]?premium|premium|is[_-]?pro|pro|is[_-]?plus|plus|isplus|is[_-]?member|member|is[_-]?subscribed|subscribed|is[_-]?purchased|purchased|has[_-]?purchased|has[_-]?subscription|is[_-]?unlocked|unlocked|is[_-]?paid|paid|is[_-]?lifetime|lifetime|is[_-]?forever|forever|is[_-]?active|active)$/i;
// 用户态到期时间
const USER_EXPIRE = /(expire|expiry|expired|end[_-]?time|endtime|valid[_-]?until|validuntil|expiretime|vip[_-]?end[_-]?time|expires_date|period[_-]?end|due[_-]?date|renew[_-]?date)/i;
// 列表项（商品/套餐）内部的锁与价格
const ITEM_LOCK = /^(is[_-]?vip|isvip|vip|locked|is[_-]?locked|is[_-]?purchased|purchased|is[_-]?buy|need[_-]?pay|needpay|paywall|is[_-]?paywall|restricted|is[_-]?restricted|need[_-]?purchase|is[_-]?free|free)$/i;
const ITEM_PRICE = /^(price|amount|money|cost|original[_-]?price|sale[_-]?price|pricestr|price[_-]?string|price[_-]?text|priceLabel)$/i;
// 统一成"未锁定"的取值
const ITEM_UNLOCK_VALUE = { "is_vip": 0, "isvip": 0, "vip": 0, "locked": false, "is_locked": false,
  "is_purchased": true, "purchased": true, "is_buy": true, "need_pay": false, "needpay": false,
  "paywall": false, "is_paywall": false, "restricted": false, "is_restricted": false,
  "need_purchase": false, "is_free": true, "free": true };

const FAR_FUTURE_MS = 4102444800000; // 2100-01-01
const FAR_FUTURE_SEC = 4102444800;
const FAR_FUTURE_STR = "2099-12-31 23:59:59";
const FAR_FUTURE_ISO = "2099-12-31T23:59:59Z";

let changed = 0;

function log() {
  if (DEBUG) console.log("[IAP] " + Array.prototype.join.call(arguments, " "));
}

function isItemContainerKey(key) {
  return /(list|items?|products?|packages?|templates?|skus?|goods|plans?|prds|purchase_?items?|vip_?items?|shop|store_?items?|bundles?|tiers?|options?)$/i.test(String(key || ""));
}

function normalizeNumber(v, key) {
  if (USER_EXPIRE.test(key)) {
    if (typeof v === "number") return v > 1e12 ? FAR_FUTURE_MS : FAR_FUTURE_SEC;
    if (typeof v === "string") {
      if (/^\d+$/.test(v)) return v.length > 10 ? String(FAR_FUTURE_MS) : String(FAR_FUTURE_SEC);
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.length > 10 ? FAR_FUTURE_ISO : FAR_FUTURE_STR;
    }
  }
  return v;
}

function rewriteLeaf(key, value, itemMode) {
  if (PRESERVE.has(norm(key))) return value;

  // 时间字段：无论用户态还是列表项，到期时间都推到远期
  if (typeof value === "string" || typeof value === "number") {
    if (USER_EXPIRE.test(key)) {
      const nv = normalizeNumber(value, key);
      if (nv !== value) { changed++; log("expire", key, value, "→", nv); }
      return nv;
    }
  }

  if (itemMode) {
    if (ITEM_PRICE.test(key)) {
      if (typeof value === "number" && value !== 0) { changed++; log("price", key, value, "→ 0"); return 0; }
      if (typeof value === "string" && value && !/^0(\.0+)?$/.test(value)) {
        changed++; log("price", key, value, "→ \"0\""); return "0";
      }
      return value;
    }
    if (ITEM_LOCK.test(key)) {
      const lower = String(key).toLowerCase();
      if (lower in ITEM_UNLOCK_VALUE) {
        const target = ITEM_UNLOCK_VALUE[lower];
        if (value !== target) { changed++; log("item", key, value, "→", target); return target; }
        return value;
      }
      // 未列出的布尔锁：一律解锁
      if (typeof value === "boolean" && value === false && /lock|pay|restrict/i.test(key)) {
        return value;
      }
    }
    return value;
  }

  // 用户态
  if (USER_TRUE.test(key)) {
    if (typeof value === "boolean") {
      if (!value) { changed++; log("user", key, value, "→ true"); return true; }
      return value;
    }
    if (typeof value === "number") {
      if (value === 0) { changed++; log("user", key, value, "→ 1"); return 1; }
      return value;
    }
    if (typeof value === "string") {
      if (value === "0" || value === "" || /^(false|no|none|null|free)$/i.test(value)) {
        changed++; log("user", key, value, "→ \"1\""); return value === "" ? "1" : "1";
      }
    }
  }
  return value;
}

function walk(node, key, itemMode) {
  if (Array.isArray(node)) {
    const nextItem = isItemContainerKey(key) || itemMode;
    for (let i = 0; i < node.length; i++) node[i] = walk(node[i], key, nextItem);
    return node;
  }
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (v && typeof v === "object") {
        node[k] = walk(v, k, false);
      } else {
        node[k] = rewriteLeaf(k, v, itemMode);
      }
    }
    return node;
  }
  return node;
}

// 已购清单：把配置里的商品 ID 补进 owned/entitlements 之类的数组
function injectProducts(node) {
  if (!PRODUCTS.length) return;
  const keys = ["owned", "purchased", "purchases", "entitlements", "active_subscriptions", "product_ids", "products"];
  (function scan(o) {
    if (Array.isArray(o)) { o.forEach(scan); return; }
    if (!o || typeof o !== "object") return;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (Array.isArray(v) && keys.indexOf(k.toLowerCase()) >= 0 && v.every((x) => typeof x === "string")) {
        const missing = PRODUCTS.filter((p) => v.indexOf(p) < 0);
        if (missing.length) { v.push.apply(v, missing); changed += missing.length; log("inject", k, "+", missing.length); }
      } else if (v && typeof v === "object") scan(v);
    }
  })(node);
}

// ---- Apple verifyReceipt ----
function fakeReceiptEntry(pid, lifetime) {
  const now = Date.now();
  const id = String(now) + "0";
  const e = {
    product_id: pid,
    quantity: "1",
    transaction_id: id,
    original_transaction_id: id,
    purchase_date_ms: String(now - 86400000),
    purchase_date: "2026-01-01 00:00:00 Etc/GMT",
    purchase_date_pst: "2025-12-31 16:00:00 America/Los_Angeles",
    original_purchase_date_ms: String(now - 86400000),
    original_purchase_date: "2026-01-01 00:00:00 Etc/GMT",
    original_purchase_date_pst: "2025-12-31 16:00:00 America/Los_Angeles",
    is_trial_period: "false",
    is_in_intro_offer_period: "false",
    in_app_ownership_type: "PURCHASED",
    web_order_line_item_id: id + "1",
  };
  if (!lifetime) {
    e.expires_date_ms = String(FAR_FUTURE_MS);
    e.expires_date = FAR_FUTURE_ISO;
    e.expires_date_pst = "2099-12-31 15:59:59 America/Los_Angeles";
  }
  return e;
}

// ---- RevenueCat（大量订阅类 App 用它下发权益）----
function fixRevenueCat(obj, url) {
  const nowIso = new Date().toISOString();
  const far = "2099-12-31T23:59:59Z";
  const entIds = (Array.isArray(CFG.entitlements) && CFG.entitlements.length)
    ? CFG.entitlements.map(String)
    : ["pro", "premium", "vip", "plus", "lifetime", "default"];
  const prods = (Array.isArray(CFG.products) && CFG.products.length) ? PRODUCTS : ["com.unlock.pro"];

  if (!obj || typeof obj !== "object") obj = {};
  if (!obj.subscriber || typeof obj.subscriber !== "object") obj.subscriber = {};
  const sub = obj.subscriber;

  if (!obj.request_date) obj.request_date = nowIso;
  if (!obj.request_date_ms) obj.request_date_ms = Date.now();

  if (!sub.entitlements || typeof sub.entitlements !== "object") sub.entitlements = {};
  entIds.forEach((id) => {
    const old = sub.entitlements[id] || {};
    sub.entitlements[id] = Object.assign({}, old, {
      expires_date: far,
      purchase_date: old.purchase_date || nowIso,
      product_identifier: old.product_identifier || prods[0],
      store: old.store || "app_store",
    });
    delete sub.entitlements[id].unsubscribe_detected_at;
    delete sub.entitlements[id].billing_issues_detected_at;
    delete sub.entitlements[id].grace_period_expires_date;
    changed++;
  });

  if (!sub.subscriptions || typeof sub.subscriptions !== "object") sub.subscriptions = {};
  prods.forEach((pid) => {
    const old = sub.subscriptions[pid] || {};
    sub.subscriptions[pid] = Object.assign({}, old, {
      expires_date: far,
      purchase_date: old.purchase_date || nowIso,
      original_purchase_date: old.original_purchase_date || nowIso,
      store: "app_store",
      period_type: "normal",
      is_sandbox: false,
      ownership_type: "PURCHASED",
      billing_issues_detected_at: null,
      unsubscribe_detected_at: null,
    });
    changed++;
  });

  if (!sub.non_subscriptions || typeof sub.non_subscriptions !== "object") sub.non_subscriptions = {};
  if (!sub.other_purchases || typeof sub.other_purchases !== "object") sub.other_purchases = {};
  if (!sub.first_seen) sub.first_seen = nowIso;
  if (!sub.original_purchase_date) sub.original_purchase_date = nowIso;
  if (!sub.original_application_version) sub.original_application_version = "1";
  if (typeof sub.management_url === "undefined") sub.management_url = null;

  // 用户 ID：优先沿用响应里的，其次从 URL 里取
  const m = /subscribers\/([^/?#]+)/.exec(url || "");
  if (!sub.original_app_user_id) sub.original_app_user_id = m ? decodeURIComponent(m[1]) : "$RCAnonymousID:unlock";
  return true;
}

// 解析本次要"补"的商品：PRODUCTS > productMap[bundle_id] > product 默认值
function resolveProduct(obj) {
  if (PRODUCTS.length) return { ids: PRODUCTS, lifetime: !!CFG.lifetime };
  const bundle = (obj.receipt && obj.receipt.bundle_id) || obj.bundle_id || "";
  const map = CFG.productMap || {};
  const hit = map[bundle];
  if (Array.isArray(hit) && hit.length) return { ids: [String(hit[0])], lifetime: Number(hit[1]) === 1 };
  if (typeof hit === "string") return { ids: [hit], lifetime: false };
  if (CFG.product) return { ids: [String(CFG.product)], lifetime: !!CFG.lifetime };
  // 兜底：沿用 App 请求里出现过的 bundle 名，保证字段形状合法
  return { ids: [bundle ? bundle + ".pro" : "com.unlock.pro"], lifetime: false };
}

function fixAppleReceipt(obj) {
  let touched = 0;
  if (typeof obj.status !== "undefined" && Number(obj.status) !== 0) {
    log("receipt status", obj.status, "→ 0");
    obj.status = 0; touched++;
  }
  if (obj.is_retryable === true) { obj.is_retryable = false; touched++; }
  obj.environment = obj.environment || "Production";

  if (!Array.isArray(obj.latest_receipt_info)) { obj.latest_receipt_info = []; touched++; }
  // 已有条目：拉长到期时间、去掉取消标记
  obj.latest_receipt_info.forEach((r) => {
    if (!r || typeof r !== "object") return;
    if (r.expires_date_ms) r.expires_date_ms = String(FAR_FUTURE_MS);
    if (r.expires_date) r.expires_date = FAR_FUTURE_ISO;
    if (r.expires_date_pst) r.expires_date_pst = "2099-12-31 15:59:59 America/Los_Angeles";
    if (r.cancellation_date_ms) delete r.cancellation_date_ms;
    if (r.cancellation_date) delete r.cancellation_date;
    touched++;
  });

  const resolved = resolveProduct(obj);
  resolved.ids.forEach((pid) => {
    if (!obj.latest_receipt_info.some((x) => x && x.product_id === pid)) {
      obj.latest_receipt_info.push(fakeReceiptEntry(pid, resolved.lifetime));
      touched++;
      log("inject receipt", pid, resolved.lifetime ? "(买断)" : "(订阅)");
    }
  });

  // 订阅续期信息：App 常用它判断是否自动续费
  if (!resolved.lifetime) {
    if (!Array.isArray(obj.pending_renewal_info)) { obj.pending_renewal_info = []; touched++; }
    resolved.ids.forEach((pid) => {
      const id = obj.latest_receipt_info[0] && obj.latest_receipt_info[0].original_transaction_id || String(Date.now());
      if (!obj.pending_renewal_info.some((x) => x && x.product_id === pid)) {
        obj.pending_renewal_info.push({
          product_id: pid,
          original_transaction_id: id,
          auto_renew_product_id: pid,
          auto_renew_status: "1",
          is_in_billing_retry_period: "0",
        });
        touched++;
      }
    });
  }

  if (obj.receipt && typeof obj.receipt === "object") {
    if (!Array.isArray(obj.receipt.in_app)) obj.receipt.in_app = [];
    resolved.ids.forEach((pid) => {
      if (!obj.receipt.in_app.some((x) => x && x.product_id === pid)) {
        obj.receipt.in_app.push({ product_id: pid, quantity: "1", purchase_date_ms: String(Date.now() - 86400000), transaction_id: String(Date.now()) });
        touched++;
      }
    });
  }
  changed += touched;
  return touched;
}

// ---- 入口 ----
(function main() {
  const url = ($request && $request.url) || "";
  if (HOSTS.length && !HOSTS.some((h) => url.indexOf(h) >= 0)) { $done({}); return; }
  if (PATHS.length && !PATHS.some((p) => url.indexOf(p) >= 0)) { $done({}); return; }

  let body = ($response && $response.body) || "";
  const isRC = /api\.revenuecat\.com/.test(url);
  if (!body) {
    if (!isRC) { $done({}); return; }
    body = "{}";
  }

  // 1) 直接是 JSON
  // 2) body 是 JSON 字符串（转义过）
  // 3) body 是 base64 包着的 JSON
  let parsed = null, mode = "";
  const tryParse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
  let first = tryParse(body);
  if (first !== null) {
    if (typeof first === "object") { parsed = first; }
    else if (typeof first === "string") {
      const second = tryParse(first);
      if (second && typeof second === "object") { parsed = second; mode = "escaped"; }
    }
  }
  if (!parsed) {
    try {
      const dec = $utils.base64Decode ? $utils.base64Decode(body.trim()) : "";
      if (dec) { const d = tryParse(dec); if (d && typeof d === "object") { parsed = d; mode = "base64"; } }
    } catch (e) {}
  }
  if (!parsed || typeof parsed !== "object") { $done({}); return; }

  if (/api\.revenuecat\.com/.test(url)) {
    fixRevenueCat(parsed, url);
  } else if (/itunes\.apple\.com\/verifyReceipt/.test(url)) {
    fixAppleReceipt(parsed);
  } else {
    walk(parsed, "", false);
    injectProducts(parsed);
  }

  if (!changed) { $done({}); return; }

  let out = JSON.stringify(parsed);
  if (mode === "escaped") out = JSON.stringify(out);
  if (mode === "base64") {
    if ($utils.base64Encode) out = $utils.base64Encode(out);
    else { $done({}); return; }
  }
  log("done, changed =", changed);
  $done({ body: out });
})();
