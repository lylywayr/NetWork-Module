/*
 * Telegram 链接重定向 - Surge
 *
 * 模块参数：
 * CLIENT=Telegram | Swiftgram | Turrit | iMe | Nicegram | Lingogram
 *
 * 请将本文件与 Telegram-Redirect.sgmodule 放在同一个 Surge 配置目录。
 */

const SCHEME = {
  Telegram: "tg",
  Swiftgram: "sg",
  Turrit: "turrit",
  iMe: "ime",
  Nicegram: "ng",
  Lingogram: "lingo",
};

function parseArgument(argument) {
  const result = {};

  if (!argument) return result;

  argument.split("&").forEach((item) => {
    const index = item.indexOf("=");

    const rawKey = index >= 0 ? item.slice(0, index) : item;
    const rawValue = index >= 0 ? item.slice(index + 1) : "";

    if (!rawKey) return;

    try {
      result[decodeURIComponent(rawKey)] = decodeURIComponent(
        rawValue.replace(/\+/g, " ")
      );
    } catch (_) {
      result[rawKey] = rawValue;
    }
  });

  return result;
}

function queryValue(queryString, key) {
  if (!queryString) return "";

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = queryString.match(
    new RegExp(`(?:^|&)${escapedKey}=([^&]*)`)
  );

  if (!match) return "";

  try {
    return decodeURIComponent(match[1].replace(/\+/g, " "));
  } catch (_) {
    return match[1];
  }
}

function encode(value) {
  return encodeURIComponent(value || "");
}

function makeDeepLink(scheme, path, queryString) {
  const parts = path.split("/").filter(Boolean);

  if (!parts[0]) return "";

  // 处理邀请链接：t.me/+xxxx
  if (parts[0].startsWith("+")) {
    return `${scheme}://join?invite=${encode(parts[0].slice(1))}`;
  }

  // 处理旧版邀请链接：t.me/joinchat/xxxx
  if (parts[0] === "joinchat" && parts[1]) {
    return `${scheme}://join?invite=${encode(parts[1])}`;
  }

  // 处理贴纸包：t.me/addstickers/xxxx
  if (parts[0] === "addstickers" && parts[1]) {
    return `${scheme}://addstickers?set=${encode(parts[1])}`;
  }

  // 处理分享链接：t.me/share/url?url=...&text=...
  if (parts[0] === "share" && parts[1] === "url") {
    const url = queryValue(queryString, "url");
    const text = queryValue(queryString, "text");

    return `${scheme}://msg_url?url=${encode(url)}&text=${encode(text)}`;
  }

  // 处理频道/群组消息：t.me/channel/123
  if (parts[1] && /^\d+$/.test(parts[1])) {
    return `${scheme}://resolve?domain=${encode(parts[0])}&post=${encode(
      parts[1]
    )}`;
  }

  // 处理普通用户名：t.me/username
  return `${scheme}://resolve?domain=${encode(parts[0])}`;
}

const urlMatch = $request.url.match(/^https?:\/\/t\.me\/(.+)$/i);

if (!urlMatch) {
  $done({});
} else {
  const args = parseArgument($argument);

  const client = (args.CLIENT || "Telegram").trim();
  const scheme = SCHEME[client] || SCHEME.Telegram;

  let tail = urlMatch[1];

  // t.me/s/channel/123 → t.me/channel/123
  if (tail.startsWith("s/")) {
    tail = tail.slice(2);
  }

  const queryIndex = tail.indexOf("?");

  const path = queryIndex === -1 ? tail : tail.slice(0, queryIndex);
  const queryString = queryIndex === -1 ? "" : tail.slice(queryIndex + 1);

  const deepLink = makeDeepLink(scheme, path, queryString);

  if (!deepLink) {
    $done({});
  } else {
    $done({
      response: {
        status: 302,
        headers: {
          Location: deepLink,
          "Cache-Control": "no-store, no-cache",
        },
        body: "",
      },
    });
  }
}