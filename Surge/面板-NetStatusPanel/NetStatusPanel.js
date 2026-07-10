/**
 * 服务解锁概览 · Surge Panel
 * 以 Surge 原生 Information Panel 的紧凑 2×4 概览形式展示。
 */

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache"
};

const SERVICES = [
  { name: "YouTube", code: "YT", url: "https://www.youtube.com/generate_204", timeout: 3, redirect: true, ok: function (s) { return s === 204; } },
  { name: "Netflix", code: "NF", url: "https://www.netflix.com/title/81280792", timeout: 5, redirect: true, ok: function (s) { return s === 200; } },
  { name: "Disney+", code: "DS", url: "https://www.disneyplus.com/", timeout: 3, redirect: false, ok: function (s) { return s > 0 && s !== 403; } },
  { name: "Spotify", code: "SP", url: "https://open.spotify.com/", timeout: 3, redirect: false, ok: function (s) { return s === 200; } },
  { name: "ChatGPT", code: "GPT", url: "https://chatgpt.com/", timeout: 3, redirect: false, ok: function (s) { return s > 0 && s !== 403 && s !== 429; } },
  { name: "Claude", code: "CL", url: "https://claude.ai/login", timeout: 3, redirect: false, ok: function (s) { return s === 200; } },
  { name: "Gemini", code: "GM", url: "https://gemini.google.com/app", timeout: 3, redirect: false, ok: function (s) { return s === 200; } },
  { name: "Grok", code: "GK", url: "https://grok.com/", timeout: 3, redirect: false, ok: function (s) { return s === 200; } }
];

function httpGet(options) {
  const timeout = Number(options.timeout || 3);

  return new Promise(function (resolve) {
    let done = false;
    const finish = function (error, response, data) {
      if (done) return;
      done = true;
      resolve({ error: error || null, response: response || null, data: data || "" });
    };

    const timer = setTimeout(function () {
      finish(new Error("Timeout"));
    }, timeout * 1000 + 250);

    try {
      $httpClient.get({
        url: options.url,
        headers: COMMON_HEADERS,
        timeout: timeout,
        "auto-redirect": options.redirect !== false
      }, function (error, response, data) {
        clearTimeout(timer);
        finish(error, response, data);
      });
    } catch (error) {
      clearTimeout(timer);
      finish(error);
    }
  });
}

async function inspect(service) {
  const startedAt = Date.now();
  const result = await httpGet(service);
  const status = result.response ? Number(result.response.status) : 0;

  return {
    code: service.code,
    available: !result.error && service.ok(status),
    latency: Math.max(0, Date.now() - startedAt)
  };
}

function latencyText(ms) {
  if (ms < 1000) return ms + "ms";
  if (ms < 10000) return (ms / 1000).toFixed(1) + "s";
  return Math.round(ms / 1000) + "s";
}

function marker(item) {
  if (!item.available) return "×";
  if (item.latency >= 1500) return "≈";
  return "✓";
}

function itemText(item) {
  return marker(item) + " " + item.code + " " + (item.available ? latencyText(item.latency) : "—");
}

function compactGrid(items) {
  const rows = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(itemText(items[index]) + "    " + itemText(items[index + 1]));
  }
  return rows.join("\n");
}

function iconColor(okCount) {
  if (okCount === SERVICES.length) return "#34C759";
  if (okCount === 0) return "#FF453A";
  return "#FF9F0A";
}

(async function () {
  const items = await Promise.all(SERVICES.map(inspect));
  const okCount = items.filter(function (item) { return item.available; }).length;
  const now = new Date();
  const time = String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");

  $done({
    title: "服务解锁 · " + okCount + "/8 · " + time,
    content: compactGrid(items),
    icon: "dot.radiowaves.left.and.right",
    "icon-color": iconColor(okCount)
  });
})().catch(function () {
  $done({
    title: "服务解锁 · 检测失败",
    content: "× 网络请求异常，请点击刷新重试",
    icon: "wifi.exclamationmark",
    "icon-color": "#FF453A"
  });
});
