/**
 * 网络服务解锁监测 · Surge Panel 移植版
 * 来源功能：milull/milu 的 Egern GPT-AI 小组件
 * 适配：Surge iOS Information Panel
 *
 * Surge Panel 只支持 title / content / style 文本卡片。
 * 本脚本保留 8 项检测、状态颜色语义、地区标识、延迟与汇总信息，
 * 并以双列文本布局输出。
 */

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache"
};

const POLICY_REGION = {
  "YouTube": "HK",
  "Netflix": "SG",
  "Disney+": "SG",
  "Spotify": "US",
  "ChatGPT": "US",
  "Claude": "US",
  "Gemini": "US",
  "Grok": "US"
};

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode === "XX" || countryCode === "--") return "";
  return String(countryCode)
    .toUpperCase()
    .replace(/./g, function (char) {
      return String.fromCodePoint(char.charCodeAt(0) + 127397);
    });
}

function httpGet(options) {
  const timeout = Number(options.timeout || 3);
  return new Promise(function (resolve) {
    let finished = false;

    function finish(error, response, data) {
      if (finished) return;
      finished = true;
      resolve({ error: error || null, response: response || null, data: data || "" });
    }

    const timer = setTimeout(function () {
      finish(new Error("Timeout"));
    }, timeout * 1000 + 250);

    try {
      $httpClient.get(
        {
          url: options.url,
          headers: options.headers || {},
          timeout: timeout,
          "auto-redirect": options.autoRedirect !== false
        },
        function (error, response, data) {
          clearTimeout(timer);
          finish(error, response, data);
        }
      );
    } catch (error) {
      clearTimeout(timer);
      finish(error);
    }
  });
}

async function timed(task) {
  const startedAt = Date.now();
  try {
    const result = await task();
    return Object.assign({}, result, { ms: Date.now() - startedAt });
  } catch (_) {
    return { code: "ERR", ms: Date.now() - startedAt };
  }
}

async function fetchProxy() {
  const response = await httpGet({
    url: "http://ip-api.com/json/?lang=zh-CN&_t=" + Date.now(),
    timeout: 3,
    headers: COMMON_HEADERS
  });

  if (response.error || !response.response) {
    return { code: "ERR", cc: "XX" };
  }

  try {
    const data = JSON.parse(response.data);
    return {
      code: data.countryCode ? "OK" : "ERR",
      cc: data.countryCode || "XX"
    };
  } catch (_) {
    return { code: "ERR", cc: "XX" };
  }
}

async function checkStatus(url, timeout, predicate, autoRedirect) {
  const result = await httpGet({
    url: url,
    timeout: timeout,
    headers: COMMON_HEADERS,
    autoRedirect: autoRedirect
  });

  const status = result.response ? Number(result.response.status) : 0;
  return { code: !result.error && predicate(status) ? "OK" : "ERR" };
}

function buildItem(name, result, proxyCountry) {
  const available = result.code !== "ERR";
  const region = available ? (POLICY_REGION[name] || proxyCountry || "XX") : "--";

  return {
    name: name,
    available: available,
    region: region,
    ms: Number(result.ms || 0)
  };
}

function statusMark(item) {
  if (!item.available) return "🔴";
  if (item.ms >= 1500) return "🟣";
  return "🟢";
}

function formatCell(item) {
  const region = item.available
    ? (getFlagEmoji(item.region) + " " + item.region)
    : "--";
  const latency = item.available ? item.ms + "ms" : "ERR";
  const label = (item.name + "        ").slice(0, 8);
  const text = statusMark(item) + " " + label + " " + region + " " + latency;

  return (text + "                         ").slice(0, 27);
}

function renderContent(items) {
  const lines = [];
  for (let index = 0; index < items.length; index += 2) {
    lines.push(formatCell(items[index]) + "  " + formatCell(items[index + 1]));
  }
  return lines.join("\n");
}

(async function () {
  const results = await Promise.all([
    timed(fetchProxy),
    timed(function () {
      return checkStatus(
        "https://www.youtube.com/generate_204",
        3,
        function (status) { return status === 204; },
        true
      );
    }),
    timed(function () {
      return checkStatus(
        "https://www.netflix.com/title/81280792",
        5,
        function (status) { return status === 200; },
        true
      );
    }),
    timed(function () {
      return checkStatus(
        "https://www.disneyplus.com/",
        3,
        function (status) { return status !== 403 && status > 0; },
        false
      );
    }),
    timed(function () {
      return checkStatus(
        "https://open.spotify.com/",
        3,
        function (status) { return status === 200; },
        false
      );
    }),
    timed(function () {
      return checkStatus(
        "https://chatgpt.com/",
        3,
        function (status) { return status !== 403 && status !== 429 && status > 0; },
        false
      );
    }),
    timed(function () {
      return checkStatus(
        "https://claude.ai/login",
        3,
        function (status) { return status === 200; },
        false
      );
    }),
    timed(function () {
      return checkStatus(
        "https://gemini.google.com/app",
        3,
        function (status) { return status === 200; },
        false
      );
    }),
    timed(function () {
      return checkStatus(
        "https://grok.com/",
        3,
        function (status) { return status === 200; },
        false
      );
    })
  ]);

  const proxy = results[0];
  const items = [
    buildItem("YouTube", results[1], proxy.cc),
    buildItem("Netflix", results[2], proxy.cc),
    buildItem("Disney+", results[3], proxy.cc),
    buildItem("Spotify", results[4], proxy.cc),
    buildItem("ChatGPT", results[5], proxy.cc),
    buildItem("Claude", results[6], proxy.cc),
    buildItem("Gemini", results[7], proxy.cc),
    buildItem("Grok", results[8], proxy.cc)
  ];

  const okCount = items.filter(function (item) { return item.available; }).length;
  const lockedCount = items.length - okCount;
  const now = new Date();
  const time = String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");

  $done({
    title: "网络服务解锁  " + okCount + "/8 · " + time,
    content: renderContent(items),
    style: lockedCount === 0 ? "good" : (okCount === 0 ? "error" : "alert")
  });
})().catch(function (error) {
  $done({
    title: "网络服务解锁",
    content: "🔴 检测脚本执行失败\n" + (error && error.message ? error.message : "Unknown error"),
    style: "error"
  });
});
