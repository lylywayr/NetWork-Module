// 波点音乐 · 广告拦截（Loon reject-dict / reject-200 的 Surge 等价实现）
// 背景：原模块从 Loon 移植，用了 reject-dict（返回 {}）和 reject-200（返回空 200），
//       Surge 只支持 header / 302 / 307 / reject，这些行会被整行忽略。
// 本脚本用 http-response 复刻原行为：
//   reject-dict  → 200 + JSON {}
//   reject-200   → 200 + 空 body

const url = ($request && $request.url) || "";

const isDict =
  /^https?:\/\/(mc\.tencentmusic\.com|xs\.gdt\.qq\.com|ad\.tencentmusic\.com)\//.test(url) ||
  /^https?:\/\/bd-api\.kuwo\.cn\/api\/(play|service|advert)\/advert\//.test(url);

if (isDict) {
  $done({
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: "{}",
  });
} else {
  // ossgw.alicdn.com/creatives-assets、h5s.kuwo.cn/m/bd_launch_popup、tmeadcomm.y.qq.com
  $done({
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: "",
  });
}
