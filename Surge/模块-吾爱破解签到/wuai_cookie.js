/**
 * 吾爱破解 Cookie 抓取（可开关）
 *
 * 模块参数 cookie=true  → 抓取 Cookie 并写入持久化存储键 wuai_cookie
 * 模块参数 cookie=false → 完全不抓取、不写入、不弹通知
 *
 * 上游签到脚本（Yuheng0101/X）读取的就是 wuai_cookie 这个键，
 * 所以抓取逻辑放在这里不会影响签到。
 */
const argument = String($argument || "");
const disabled = /(?:^|[&;,\s])cookie\s*=\s*(?:false|0|off|no)\b/i.test(argument);

if (disabled) {
  // 关闭抓取：直接放行请求，不做任何处理
  $done({});
} else {
  const headers = ($request && $request.headers) || {};
  const cookie = headers.Cookie || headers.cookie || "";
  if (cookie) {
    $persistentStore.write(cookie, "wuai_cookie");
    $notification.post("吾爱破解", "Cookie 已获取", "之后可在模块参数里把 cookie 设为 false");
  } else {
    $notification.post("吾爱破解", "未取到 Cookie", "请确认已登录 www.52pojie.cn");
  }
  $done({});
}
