/**
 * PingMe Cookie 抓取（带开关）
 * cookie=false 时完全不抓取；true 时执行上游抓取逻辑
 */
const ARG = String($argument || "");
const OFF = /(?:^|[;&\s])cookie\s*=\s*(?:false|0|off|no)\b/i.test(ARG);
if (OFF) { $done({}); } else {
  const SRC = "https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/cookie/get_cookie.js";
  const KEY = "gate_src_pingme";
  const run = (code) => { try { eval(code); } catch (e) { $done({}); } };
  const cached = $persistentStore.read(KEY);
  if (cached && cached.length > 500) { run(cached); }
  else {
    $httpClient.get({ url: SRC, timeout: 40 }, (e, r, b) => {
      if (e || !b || b.length < 200) { $done({}); return; }
      if (b.length < 300000) $persistentStore.write(b, KEY);
      run(b);
    });
  }
}
