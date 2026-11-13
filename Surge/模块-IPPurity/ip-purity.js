/**
 * IP 纯净度 — Surge 信息面板脚本
 *
 * 在 Surge 的「策略组」页面底部显示当前出口 IP 的纯净度：
 *   IPv4 / 位置 / ASN / 类型（住宅·家宽 / 机房·云 / 移动网络）/ 风险等级
 *
 * 数据源（按顺序，上一层失败才走下一层）：
 *   1. api.ipquery.io   — IP、归属地、ASN、机房/代理标记、risk_score
 *   2. api.ip.sb/geoip  — 备用归属地源（无风险分）
 *   3. scamalytics.com  — 仅在缺少风险分时补一个欺诈分（0-100）
 *
 * 触发：$input.purpose === "panel"，点刷新按钮或到 update-interval 自动执行
 */

const API_PRIMARY = "https://api.ipquery.io/?format=json";
const API_FALLBACK = "https://api.ip.sb/geoip";
const SCAMALYTICS = "https://scamalytics.com/ip/";
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const CACHE_KEY = "ip_purity_panel_cache";

/* ---------------- 工具 ---------------- */

function flagEmoji(cc) {
  if (!cc || cc.length !== 2 || !/^[A-Za-z]{2}$/.test(cc)) return "🌐";
  const base = 0x1f1e6;
  const up = cc.toUpperCase();
  return String.fromCodePoint(base + up.charCodeAt(0) - 65, base + up.charCodeAt(1) - 65);
}

function pick() {
  for (let i = 0; i < arguments.length; i++) {
    const v = arguments[i];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

// 中文字符按 2 列宽对齐
function pad(label, width) {
  let w = 0;
  for (const ch of label) {
    w += /[\u2e80-\u9fff\uff00-\uffef\u3000-\u303f]/.test(ch) ? 2 : 1;
  }
  return label + " ".repeat(Math.max(1, width - w));
}

function hasScore(s) {
  return typeof s === "number" && !isNaN(s);
}

function riskBadge(score) {
  if (!hasScore(score)) return "⚪️ 未知";
  if (score <= 25) return "🟢 " + score;
  if (score <= 60) return "🟡 " + score;
  return "🔴 " + score;
}

function riskStyle(score) {
  if (!hasScore(score)) return "info";
  if (score <= 25) return "good";
  if (score <= 60) return "info";
  return "alert";
}

/* ---------------- 归一化 ---------------- */

function fromIpquery(j) {
  const loc = j.location || {};
  const isp = j.isp || {};
  const risk = j.risk || {};
  return {
    ip: pick(j.ip),
    cc: pick(loc.country_code),
    country: pick(loc.country),
    city: pick(loc.city),
    asn: pick(isp.asn),
    org: pick(isp.org, isp.isp),
    isDatacenter: risk.is_datacenter === true,
    isMobile: risk.is_mobile === true,
    isProxy: risk.is_proxy === true,
    isVpn: risk.is_vpn === true,
    isTor: risk.is_tor === true,
    riskScore: hasScore(risk.risk_score) ? risk.risk_score : null
  };
}

// 备用源没有机房标记，用运营商名做个粗判
const HOSTING_HINTS = [
  "amazon", "aws", "google", "microsoft", "azure", "oracle", "digitalocean",
  "linode", "vultr", "hetzner", "ovh", "contabo", "alibaba", "aliyun",
  "tencent", "ucloud", "cloudflare", "akamai", "fastly", "leaseweb", "m247",
  "hosting", "datacenter", "data center", "server", "cloud", "vps", "idc",
  "bandwidth", "choopa", "psychz", "colocation"
];

function looksLikeHosting(str) {
  const s = String(str || "").toLowerCase();
  return HOSTING_HINTS.some(function (k) {
    return s.indexOf(k) !== -1;
  });
}

function fromIpsb(j) {
  const org = pick(j.asn_organization, j.organization, j.isp);
  return {
    ip: pick(j.ip),
    cc: pick(j.country_code),
    country: pick(j.country),
    city: pick(j.city),
    asn: j.asn ? "AS" + j.asn : "",
    org: org,
    isDatacenter: looksLikeHosting(org),
    isMobile: false,
    isProxy: false,
    isVpn: false,
    isTor: false,
    riskScore: null
  };
}

function lineTypeOf(info) {
  const flags = [];
  if (info.isTor) flags.push("Tor");
  if (info.isVpn) flags.push("VPN");
  if (info.isProxy) flags.push("代理");

  let base;
  if (info.isDatacenter) base = "🏢 机房 / 云主机";
  else if (info.isMobile) base = "📱 移动网络";
  else base = "🏠 住宅 / 家宽";

  return flags.length ? base + " · " + flags.join(" / ") : base;
}

/* ---------------- 渲染 ---------------- */

function render(info, score) {
  const where = [info.city, info.country].filter(Boolean).join(" · ") || "未知";
  const asnLine = info.asn
    ? info.asn + (info.org && info.org.indexOf(info.asn) === -1 ? "  " + info.org : "")
    : "未知";

  const content = [
    pad("IPv4", 10) + (info.ip || "未知"),
    pad("位置", 10) + flagEmoji(info.cc) + " · " + where,
    pad("ASN", 10) + asnLine,
    pad("类型", 10) + lineTypeOf(info),
    pad("风险等级", 10) + riskBadge(score) + " / 100"
  ].join("\n");

  return { title: "IP 纯净度", content: content, style: riskStyle(score) };
}

function finish(obj) {
  $done(obj);
}

function fail(msg) {
  let cached = null;
  try {
    cached = $persistentStore.read(CACHE_KEY);
  } catch (e) {}
  if (cached) {
    try {
      const c = JSON.parse(cached);
      finish({ title: "IP 纯净度", content: c.content + "\n⚠️ " + msg, style: "alert" });
      return;
    } catch (e) {}
  }
  finish({ title: "IP 纯净度", content: "检测失败：" + msg, style: "error" });
}

/* ---------------- 主流程 ---------------- */

function fetchText(url, timeout, cb) {
  $httpClient.get(
    { url: url, headers: { "User-Agent": UA }, timeout: timeout },
    function (err, resp, data) {
      if (err) return cb(err, null);
      if (!data) return cb("空响应", null);
      if (resp && resp.status && resp.status >= 400) return cb("HTTP " + resp.status, null);
      cb(null, data);
    }
  );
}

function fetchJson(url, timeout, cb) {
  fetchText(url, timeout, function (err, data) {
    if (err) return cb(err, null);
    let j = null;
    try {
      j = JSON.parse(data);
    } catch (e) {
      return cb("解析失败", null);
    }
    cb(null, j);
  });
}

function fetchFraudScore(ip, cb) {
  if (!ip) return cb(null);
  fetchText(SCAMALYTICS + ip, 5, function (err, data) {
    if (err) return cb(null);
    const m = String(data).match(/Fraud Score:\s*(\d+)/);
    cb(m ? parseInt(m[1], 10) : null);
  });
}

function deliver(info, score) {
  const out = render(info, score);
  try {
    $persistentStore.write(JSON.stringify(out), CACHE_KEY);
  } catch (e) {}
  finish(out);
}

function withScore(info) {
  if (hasScore(info.riskScore)) return deliver(info, info.riskScore);
  fetchFraudScore(info.ip, function (fraud) {
    deliver(info, fraud);
  });
}

fetchJson(API_PRIMARY, 7, function (err1, j1) {
  if (!err1 && j1 && j1.ip) return withScore(fromIpquery(j1));

  fetchJson(API_FALLBACK, 5, function (err2, j2) {
    if (!err2 && j2 && j2.ip) return withScore(fromIpsb(j2));
    fail(err1 || err2 || "无数据");
  });
});
