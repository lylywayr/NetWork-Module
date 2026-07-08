/**
 * Egern「网络诊断雷达」完整脚本
 *
 * 存档说明：
 * - 上一稳定版已设为「存档 1」
 * - 后续如出现布局或功能损坏，以「存档 1」作为回退基准
 *
 * 当前版本重点：
 * 1. 仅「当前代理」区域使用效果图风格仪表
 * 2. 本地网络、流媒体、AI 检测区域保持原有结构
 * 3. 当前代理纯净度仪表：
 *    - 0 分在最左
 *    - 50 分在顶部
 *    - 100 分在最右
 *    - 左侧绿色进度
 *    - 右侧红色剩余风险
 *    - 分数文字不被弧线遮挡
 * 4. 最底部状态栏去掉外层方框和小格子边框
 *
 * 可选环境变量：
 * POLICY=策略组名称
 * TIMEOUT_MS=4500
 * REFRESH_MINUTES=15
 * NODE_PROTOCOL=Reality
 * COLOR_SCHEME=light 或 dark
 */

export default async function (ctx) {
  const env = ctx.env || {};
  const C = palette();
  const SCHEME = detectScheme(ctx, env);

  const POLICY = clean(env.POLICY);
  const POLICY_LABEL = POLICY || "默认规则";
  const TIMEOUT = numberInRange(env.TIMEOUT_MS, 1500, 10000, 4500);
  const REFRESH_MINUTES = numberInRange(env.REFRESH_MINUTES, 5, 60, 15);
  const NODE_PROTOCOL = clean(env.NODE_PROTOCOL) || "Reality";

  const device = ctx.device || {};
  const wifi = device.wifi || {};
  const cellular = device.cellular || {};
  const ipv4 = device.ipv4 || {};
  const ipv6 = device.ipv6 || {};

  const dnsServers = Array.isArray(device.dnsServers)
    ? device.dnsServers.filter(Boolean)
    : [];

  const networkName =
    clean(wifi.ssid) ||
    clean(cellular.carrier) ||
    "当前网络";

  const localIP =
    clean(
      pick(
        ipv4.address,
        wifi.ip,
        wifi.ipAddress,
        device.ipAddress,
        device.ip
      )
    ) || "未获取";

  const gateway =
    clean(
      pick(
        ipv4.gateway,
        wifi.gateway,
        device.gateway
      )
    ) || "未获取";

  const hasIPv4 = Boolean(clean(localIP)) && localIP !== "未获取";
  const hasIPv6 = Boolean(clean(pick(ipv6.address, device.ipv6Address)));
  const baseDNS = detectDNSProvider(dnsServers);
  const now = new Date();

  function uiColor(value) {
    return resolveAdaptiveColor(value, SCHEME);
  }

  function requestOptions(extra) {
    const options = {
      timeout: TIMEOUT,
      redirect: "follow",
      credentials: "omit",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        Accept: "application/json,text/plain,text/html,*/*",
        "Cache-Control": "no-cache"
      }
    };

    if (POLICY) {
      options.policy = POLICY;
    }

    return Object.assign(options, extra || {});
  }

  function directRequestOptions(extra) {
    return Object.assign(
      {
        timeout: Math.min(TIMEOUT, 4500),
        redirect: "follow",
        credentials: "omit",
        policy: "DIRECT",
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
          Accept: "application/json,text/plain,text/html,*/*",
          "Cache-Control": "no-cache"
        }
      },
      extra || {}
    );
  }

  async function getJSON(url) {
    try {
      const response = await ctx.http.get(url, requestOptions());

      return {
        ok: response.status >= 200 && response.status < 400,
        status: response.status,
        data: await response.json()
      };
    } catch (_) {
      return {
        ok: false,
        status: 0,
        data: null
      };
    }
  }

  async function getJSONDirect(url) {
    try {
      const response = await ctx.http.get(url, directRequestOptions());

      return {
        ok: response.status >= 200 && response.status < 400,
        status: response.status,
        data: await response.json()
      };
    } catch (_) {
      return {
        ok: false,
        status: 0,
        data: null
      };
    }
  }

  async function getText(url) {
    const startedAt = Date.now();

    try {
      const response = await ctx.http.get(url, requestOptions());

      return {
        ok: response.status >= 200 && response.status < 400,
        status: response.status,
        text: (await response.text()) || "",
        ms: Math.max(1, Date.now() - startedAt)
      };
    } catch (_) {
      return {
        ok: false,
        status: 0,
        text: "",
        ms: Math.max(1, Date.now() - startedAt)
      };
    }
  }

  async function getStatus(url) {
    const startedAt = Date.now();

    try {
      const response = await ctx.http.get(url, requestOptions());

      return {
        ok: response.status >= 200 && response.status < 400,
        status: response.status,
        ms: Math.max(1, Date.now() - startedAt)
      };
    } catch (_) {
      return {
        ok: false,
        status: 0,
        ms: Math.max(1, Date.now() - startedAt)
      };
    }
  }

  async function getStatusDirect(url) {
    const startedAt = Date.now();

    try {
      const response = await ctx.http.get(url, directRequestOptions());

      return {
        ok: response.status >= 200 && response.status < 400,
        status: response.status,
        ms: Math.max(1, Date.now() - startedAt)
      };
    } catch (_) {
      return {
        ok: false,
        status: 0,
        ms: Math.max(1, Date.now() - startedAt)
      };
    }
  }

  async function getExit() {
    const results = await Promise.all([
      getJSON("https://api.ipapi.is/?_=" + Date.now()),
      getJSON("https://ipwho.is/?_=" + Date.now()),
      getJSON("https://ipinfo.io/json?_=" + Date.now())
    ]);

    for (let index = 0; index < results.length; index += 1) {
      const parsed = parseExit(results[index].data);

      if (results[index].ok && parsed.ip) {
        return parsed;
      }
    }

    return {
      ip: "未识别",
      city: "出口检测失败",
      region: "",
      country: "",
      countryCode: "",
      isp: "未知组织",
      kind: "未知",
      flags: {}
    };
  }

  async function getLocalExit() {
    const results = await Promise.all([
      getJSONDirect(
        "http://ip-api.com/json/?lang=zh-CN&fields=status,message,query,country,countryCode,regionName,city,isp,org&_=" +
          Date.now()
      ),
      getJSONDirect("https://ipwho.is/?lang=zh-CN&_=" + Date.now()),
      getJSONDirect("https://api.ipapi.is/?_=" + Date.now())
    ]);

    for (let index = 0; index < results.length; index += 1) {
      const parsed = parseLocalExit(results[index].data);

      if (results[index].ok && parsed.ip) {
        return parsed;
      }
    }

    return {
      ip: "",
      city: "",
      region: "",
      country: "",
      countryCode: "",
      isp: "",
      label: "直连地区未知"
    };
  }

  async function getDNSVerified() {
    const host = randomAlphaNum(32) + ".edns.ip-api.com";

    const result = await getJSONDirect(
      "http://" + host + "/json?_=" + Date.now()
    );

    if (!result.ok || !result.data) {
      return {
        ok: false,
        full: "",
        short: "",
        ip: "",
        geo: ""
      };
    }

    const dns = result.data.dns || {};
    const ip = clean(dns.ip);
    const geo = clean(dns.geo);
    const combined = [geo, ip].join(" ");
    const fromGeo = providerFromText(combined);

    if (fromGeo.short) {
      return {
        ok: true,
        full: fromGeo.full,
        short: fromGeo.short,
        ip: ip,
        geo: geo
      };
    }

    const fromIP = detectDNSProvider([ip]);

    if (fromIP.short && !isWeakDNSLabel(fromIP.short)) {
      return {
        ok: true,
        full: fromIP.full,
        short: fromIP.short,
        ip: ip,
        geo: geo
      };
    }

    return {
      ok: true,
      full: geo || "未知 DNS",
      short: shortDNSGeo(geo),
      ip: ip,
      geo: geo
    };
  }

  async function getProxyLatency() {
    const result = await getStatus(
      "https://cp.cloudflare.com/generate_204?_=" + Date.now()
    );

    return {
      ok: result.ok,
      ms: result.ms
    };
  }

  async function getLocalLatency() {
    const result = await getStatusDirect(
      "https://cp.cloudflare.com/generate_204?_=" + Date.now()
    );

    if (result.ok) {
      return {
        ok: true,
        ms: result.ms
      };
    }

    const backup = await getStatusDirect(
      "http://captive.apple.com/hotspot-detect.html?_=" + Date.now()
    );

    return {
      ok: backup.ok,
      ms: backup.ms
    };
  }

  async function getQuic() {
    const result = await getText(
      "https://cloudflare-quic.com/cdn-cgi/trace?_=" + Date.now()
    );

    if (!result.ok) {
      return {
        value: "×/×",
        tone: "red"
      };
    }

    const trace = parseTrace(result.text);
    const protocol = clean(trace.http).toLowerCase();

    if (
      protocol === "h3" ||
      protocol === "http/3" ||
      protocol.includes("h3")
    ) {
      return {
        value: "✓/✓",
        tone: "green"
      };
    }

    return {
      value: "×/×",
      tone: "red"
    };
  }

  async function testService(id, name, kind, color, url) {
    const separator = url.includes("?") ? "&" : "?";

    const result = await getStatus(
      url + separator + "_=" + Date.now()
    );

    return {
      id: id,
      name: name,
      kind: kind,
      color: color,
      ok: result.ok
    };
  }

  const [
    exit,
    localExit,
    verifiedDNS,
    proxyLatency,
    localLatency,
    quic,
    media,
    ai
  ] = await Promise.all([
    getExit(),
    getLocalExit(),
    getDNSVerified(),
    getProxyLatency(),
    getLocalLatency(),
    getQuic(),

    Promise.all([
      testService("netflix", "Netflix", "netflix", C.netflix, "https://www.netflix.com/title/81215567"),
      testService("disney", "Disney+", "disney", C.disney, "https://www.disneyplus.com/"),
      testService("spotify", "Spotify", "spotify", C.spotify, "https://open.spotify.com/"),
      testService("tiktok", "TikTok", "tiktok", C.tiktok, "https://www.tiktok.com/"),
      testService("youtube", "YouTube", "youtube", C.youtube, "https://www.youtube.com/"),
      testService("prime", "Prime", "prime", C.prime, "https://www.primevideo.com/")
    ]),

    Promise.all([
      testService("chatgpt", "ChatGPT", "chatgpt", C.chatgpt, "https://chatgpt.com/"),
      testService("claude", "Claude", "claude", C.claude, "https://claude.ai/"),
      testService("gemini", "Gemini", "gemini", C.gemini, "https://gemini.google.com/"),
      testService("deepseek", "DeepSeek", "deepseek", C.deepseek, "https://chat.deepseek.com/"),
      testService("grok", "Grok", "grok", C.grok, "https://grok.com/"),
      testService("perplexity", "Perplexity", "perplexity", C.perplexity, "https://www.perplexity.ai/")
    ])
  ]);

  const dns = chooseDNSProvider(baseDNS, verifiedDNS);
  const dnsLabel = dnsTinyLabel(dns.short || dns.full);
  const localArea = localExit.label || "直连地区未知";
  const nat = detectNAT(localIP, exit.ip);
  const purity = purityScore(exit);
  const risk = riskLevel(exit, purity);

  const proxyLatencyColor = proxyLatency.ok
    ? proxyLatency.ms <= 220 ? C.green : C.amber
    : C.red;

  const localLatencyColor = localLatency.ok
    ? localLatency.ms <= 220 ? C.green : C.amber
    : C.red;

  const natColor = toneColor(nat.tone, C);
  const quicColor = toneColor(quic.tone, C);

  const purityColor =
    purity.score >= 85 ? C.green :
    purity.score >= 65 ? C.amber :
    C.red;

  const riskColor =
    risk === "低风险" ? C.green :
    risk === "中风险" ? C.amber :
    C.red;

  function merge(base, extra) {
    return Object.assign({}, base || {}, extra || {});
  }

  function text(value, size, weight, color, extra) {
    return merge(
      {
        type: "text",
        text: String(value),
        font: {
          size: size,
          weight: weight || "regular"
        },
        textColor: color || C.text
      },
      extra
    );
  }

  function image(symbol, color, width, height, extra) {
    return merge(
      {
        type: "image",
        src: "sf-symbol:" + symbol,
        color: color || C.text,
        width: width || 10,
        height: height || 10
      },
      extra
    );
  }

  function rawImage(src, width, height, extra) {
    return merge(
      {
        type: "image",
        src: src,
        width: width,
        height: height,
        resizable: true
      },
      extra || {}
    );
  }

  function svgImage(svg, width, height, extra) {
    return rawImage(svgDataURI(svg), width, height, extra);
  }

  function row(children, extra) {
    return merge(
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        children: children || []
      },
      extra
    );
  }

  function col(children, extra) {
    return merge(
      {
        type: "stack",
        direction: "column",
        alignItems: "start",
        children: children || []
      },
      extra
    );
  }

  function spacer(length) {
    return length === undefined
      ? { type: "spacer" }
      : { type: "spacer", length: length };
  }

  function card(children, extra) {
    return merge(
      {
        type: "stack",
        direction: "column",
        alignItems: "start",
        padding: [6, 7],
        gap: 4,
        backgroundColor: C.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.cardBorder,
        children: children || []
      },
      extra
    );
  }

  function pill(value, tone, fill, extra) {
    return row(
      [
        text(value, 6, "semibold", tone, {
          maxLines: 1,
          minScale: 0.72,
          textAlign: "center"
        })
      ],
      merge(
        {
          padding: [2, 5],
          backgroundColor: fill,
          borderRadius: 8
        },
        extra
      )
    );
  }

  function iconBox(symbol, tone, fill, side) {
    return row(
      [
        image(
          symbol,
          tone,
          Math.round(side * 0.52),
          Math.round(side * 0.52)
        )
      ],
      {
        width: side,
        height: side,
        padding: 3,
        backgroundColor: fill,
        borderRadius: 12
      }
    );
  }

  function sectionTitle(symbol, title, right, tone) {
    const children = [
      image(symbol, tone, 11, 11),
      text(title, 10, "semibold", C.text, {
        maxLines: 1
      })
    ];

    if (right) {
      children.push(spacer());
      children.push(right);
    }

    return row(children, { gap: 3 });
  }

  function metricBox(symbol, label, value, tone, extra) {
    const options = extra || {};
    const valueSize = options.valueSize || 6.1;
    const valueMinScale = options.valueMinScale || 0.35;

    return col(
      [
        row(
          [
            image(symbol, tone, 7, 7),
            text(label, 5, "medium", C.muted, {
              maxLines: 1,
              minScale: 0.78,
              textAlign: "center"
            })
          ],
          {
            gap: 1,
            alignItems: "center"
          }
        ),

        text(value, valueSize, "semibold", tone, {
          maxLines: 1,
          minScale: valueMinScale,
          textAlign: "center"
        })
      ],
      {
        flex: 1,
        height: 24,
        padding: [0, 0],
        gap: 0,
        alignItems: "center"
      }
    );
  }

  function header() {
    return row(
      [
        row(
          [
            iconBox("waveform.path.ecg", C.blue, C.blueSoft, 28),

            col(
              [
                row(
                  [
                    text("网络诊断雷达", 11, "bold", C.text, {
                      maxLines: 1,
                      minScale: 0.72
                    }),

                    pill("Pro", C.purple, C.purpleSoft, {
                      padding: [1, 4]
                    })
                  ],
                  {
                    gap: 3,
                    alignItems: "center"
                  }
                ),

                text("Egern · 全面网络状态检测", 6, "medium", C.muted, {
                  maxLines: 1,
                  minScale: 0.78
                })
              ],
              {
                flex: 1,
                gap: 0
              }
            )
          ],
          {
            width: 171,
            height: 34,
            gap: 6
          }
        ),

        row(
          [
            spacer(),

            image("scope", C.purple, 11, 11),

            col(
              [
                text("当前策略", 5, "medium", C.muted, {
                  maxLines: 1,
                  textAlign: "center"
                }),

                row(
                  [
                    text(
                      POLICY ? "●" : "○",
                      7,
                      "bold",
                      POLICY ? C.green : C.purple
                    ),

                    text(POLICY_LABEL, 7, "semibold", C.text, {
                      maxLines: 1,
                      minScale: 0.72
                    })
                  ],
                  {
                    gap: 2,
                    alignItems: "center"
                  }
                )
              ],
              {
                width: 52,
                gap: 0,
                alignItems: "start"
              }
            ),

            spacer()
          ],
          {
            flex: 1,
            height: 34,
            padding: [3, 0],
            gap: 3
          }
        ),

        col(
          [
            text(timeLabel(now), 11, "bold", C.text, {
              maxLines: 1,
              minScale: 0.82,
              textAlign: "right"
            }),

            text(dateLabel(now), 5, "medium", C.muted, {
              maxLines: 1,
              minScale: 0.82,
              textAlign: "right"
            })
          ],
          {
            width: 43,
            height: 34,
            alignItems: "end",
            gap: 0
          }
        )
      ],
      {
        height: 34,
        gap: 4
      }
    );
  }

  function localCard() {
    return card(
      [
        sectionTitle(
          "wifi",
          "本地网络",
          image("globe.asia.australia.fill", C.blue, 12, 12),
          C.blue
        ),

        row(
          [
            iconBox("wifi", C.blue, C.blueSoft, 42),

            col(
              [
                row(
                  [
                    text(networkName, 11, "semibold", C.text, {
                      flex: 1,
                      maxLines: 1,
                      minScale: 0.68
                    }),

                    pill("已连接", C.green, C.greenSoft, {
                      padding: [1, 4]
                    })
                  ],
                  { gap: 3 }
                ),

                text(localIP, 8, "medium", C.subtext, {
                  maxLines: 1,
                  minScale: 0.72
                }),

                row(
                  [
                    text(flag(localExit.countryCode) || "📍", 8, "regular", C.text, {
                      maxLines: 1
                    }),

                    text(localArea, 7, "medium", C.muted, {
                      maxLines: 1,
                      minScale: 0.72
                    })
                  ],
                  { gap: 2 }
                )
              ],
              {
                flex: 1,
                gap: 1
              }
            )
          ],
          { gap: 6 }
        ),

        row(
          [
            metricBox(
              "router.fill",
              "网关",
              gatewayLabel(gateway),
              C.blue,
              {
                valueSize: 5.4,
                valueMinScale: 0.28
              }
            ),

            metricBox(
              "clock",
              "直连延迟",
              localLatency.ok ? localLatency.ms + "ms" : "失败",
              localLatencyColor
            ),

            metricBox(
              "network",
              "IPV4/IPV6",
              (hasIPv4 ? "✓" : "×") + "/" + (hasIPv6 ? "✓" : "×"),
              hasIPv4 && hasIPv6
                ? C.green
                : hasIPv4
                  ? C.amber
                  : C.red
            ),

            metricBox(
              "cloud.fill",
              "DNS",
              dnsLabel,
              C.purple,
              {
                valueSize: 5.4,
                valueMinScale: 0.28
              }
            )
          ],
          { gap: 2 }
        )
      ],
      {
        flex: 1,
        height: 100
      }
    );
  }

  function flagBox() {
    return row(
      [
        text(flag(exit.countryCode) || "🇺🇸", 22, "regular", C.text, {
          maxLines: 1,
          textAlign: "center"
        })
      ],
      {
        width: 36,
        height: 36,
        padding: 2,
        backgroundColor: C.purpleSoft,
        borderRadius: 11
      }
    );
  }

  function scoreGauge() {
    return svgImage(
      purityGaugeSVG(
        purity.score,
        {
          track: uiColor(C.scoreTrack),
          left: uiColor(C.scoreLeft),
          right: uiColor(C.scoreRight),
          glow: uiColor(C.scoreGlow),
          text: uiColor(C.scoreLeft),
          muted: uiColor(C.muted),
          darkLine: uiColor(C.scoreDarkLine)
        }
      ),
      68,
      52,
      {
        borderRadius: 16
      }
    );
  }

  function proxyCard() {
    const city =
      clean(exit.city) ||
      clean(exit.country) ||
      "未知地区";

    const tagOne =
      exit.kind === "数据中心"
        ? "数据中心"
        : "住宅 IP";

    const tagTwo =
      exit.kind === "数据中心"
        ? "代理出口"
        : "原生住宅";

    return card(
      [
        sectionTitle(
          "point.3.connected.trianglepath.dotted",
          "当前代理",
          pill(
            proxyLatency.ok ? "连接正常" : "检测失败",
            proxyLatency.ok ? C.green : C.red,
            proxyLatency.ok ? C.greenSoft : C.redSoft
          ),
          C.purple
        ),

        row(
          [
            flagBox(),

            col(
              [
                row(
                  [
                    text(flag(exit.countryCode) || "🇺🇸", 7, "regular", C.text),

                    text(city, 9.2, "semibold", C.text, {
                      flex: 1,
                      maxLines: 1,
                      minScale: 0.55
                    })
                  ],
                  { gap: 2 }
                ),

                text(shortISP(exit.isp), 7.2, "medium", C.subtext, {
                  maxLines: 1,
                  minScale: 0.62
                }),

                row(
                  [
                    pill(tagOne, C.green, C.greenSoft, {
                      padding: [1, 3]
                    }),

                    pill(tagTwo, C.green, C.greenSoft, {
                      padding: [1, 3]
                    })
                  ],
                  { gap: 2 }
                )
              ],
              {
                flex: 1,
                gap: 2
              }
            ),

            row(
              [
                scoreGauge()
              ],
              {
                width: 68,
                height: 52,
                alignItems: "center",
                justifyContent: "center"
              }
            )
          ],
          {
            gap: 4,
            alignItems: "center"
          }
        ),

        row(
          [
            metricBox(
              "clock",
              "延迟",
              proxyLatency.ok ? proxyLatency.ms + "ms" : "失败",
              proxyLatencyColor
            ),

            metricBox(
              "circle.hexagongrid.fill",
              "NAT",
              nat.label,
              natColor
            ),

            metricBox(
              "paperplane.fill",
              "UDP/Q",
              quic.value,
              quicColor
            ),

            metricBox(
              "slider.horizontal.3",
              "协议",
              NODE_PROTOCOL,
              C.purple
            )
          ],
          { gap: 2 }
        )
      ],
      {
        flex: 1,
        height: 100,
        padding: [5, 6],
        gap: 3,
        backgroundGradient: {
          type: "linear",
          colors: [C.proxyTop, C.proxyBottom],
          startPoint: { x: 0, y: 0 },
          endPoint: { x: 1, y: 1 }
        }
      }
    );
  }

  function serviceLogoLarge(item) {
    const base = {
      width: 23,
      height: 23,
      padding: 2,
      backgroundColor: C.tileIconBg,
      borderRadius: 7
    };

    if (item.kind === "spotify") {
      return row(
        [
          image("dot.radiowaves.left.and.right", item.color, 15, 15)
        ],
        base
      );
    }

    if (item.kind === "tiktok") {
      return row(
        [
          image("music.note", item.color, 15, 15)
        ],
        base
      );
    }

    if (item.kind === "youtube") {
      return row(
        [
          image("play.rectangle.fill", item.color, 15, 15)
        ],
        base
      );
    }

    if (item.kind === "prime") {
      return row(
        [
          image("play.tv.fill", item.color, 15, 15)
        ],
        base
      );
    }

    if (item.kind === "chatgpt") {
      return row(
        [
          image("circle.hexagongrid", item.color, 15, 15)
        ],
        base
      );
    }

    if (item.kind === "gemini") {
      return row(
        [
          image("sparkles", item.color, 15, 15)
        ],
        base
      );
    }

    if (item.kind === "grok") {
      return row(
        [
          image("xmark", item.color, 14, 14)
        ],
        base
      );
    }

    if (item.kind === "perplexity") {
      return row(
        [
          image("magnifyingglass", item.color, 14, 14)
        ],
        base
      );
    }

    const mark =
      item.kind === "netflix"
        ? "N"
        : item.kind === "disney"
          ? "D+"
          : item.kind === "deepseek"
            ? "D"
            : "AI";

    const fontSize =
      item.kind === "claude"
        ? 10
        : item.kind === "disney"
          ? 10
          : 13;

    return row(
      [
        text(mark, fontSize, "bold", item.color, {
          maxLines: 1,
          textAlign: "center"
        })
      ],
      base
    );
  }

  function compactServiceTile(item) {
    const statusColor = item.ok ? C.green : C.red;

    return row(
      [
        serviceLogoLarge(item),

        col(
          [
            text(item.name, 7, "semibold", C.text, {
              maxLines: 1,
              minScale: 0.66
            }),

            row(
              [
                text(
                  exit.countryCode
                    ? flag(exit.countryCode) + " " + exit.countryCode
                    : "NET",
                  5,
                  "medium",
                  C.subtext,
                  {
                    maxLines: 1
                  }
                ),

                text(
                  item.ok ? "OK" : "失败",
                  5.6,
                  "semibold",
                  statusColor,
                  {
                    maxLines: 1
                  }
                )
              ],
              { gap: 2 }
            )
          ],
          {
            flex: 1,
            gap: 1
          }
        )
      ],
      {
        flex: 1,
        height: 31,
        padding: [4, 4],
        gap: 4,
        backgroundColor: C.tileBg,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: C.tileBorder
      }
    );
  }

  function serviceGrid(items) {
    return col(
      [
        row(
          [
            compactServiceTile(items[0]),
            compactServiceTile(items[1])
          ],
          {
            height: 31,
            gap: 5
          }
        ),

        row(
          [
            compactServiceTile(items[2]),
            compactServiceTile(items[3])
          ],
          {
            height: 31,
            gap: 5
          }
        ),

        row(
          [
            compactServiceTile(items[4]),
            compactServiceTile(items[5])
          ],
          {
            height: 31,
            gap: 5
          }
        )
      ],
      {
        flex: 1,
        height: 101,
        gap: 4
      }
    );
  }

  function serviceCard(title, symbol, items, tone) {
    const passed = items.filter(item => item.ok).length;

    return card(
      [
        sectionTitle(
          symbol,
          title,
          pill(
            passed + "/" + items.length,
            passed === items.length ? C.green : C.amber,
            passed === items.length ? C.greenSoft : C.amberSoft
          ),
          tone
        ),

        serviceGrid(items)
      ],
      {
        flex: 1,
        height: 133,
        padding: [5, 6],
        gap: 5
      }
    );
  }

  function footerCell(symbol, label, value, tone) {
    return col(
      [
        row(
          [
            image(symbol, tone, 13, 13),

            col(
              [
                text(label, 6, "medium", C.muted, {
                  maxLines: 1
                }),

                text(value, 7, "semibold", tone, {
                  maxLines: 1,
                  minScale: 0.64
                })
              ],
              {
                flex: 1,
                gap: 0
              }
            )
          ],
          {
            gap: 4
          }
        )
      ],
      {
        flex: 1,
        padding: [1, 3]
      }
    );
  }

  function footer() {
    const typeColor =
      exit.kind === "数据中心"
        ? C.amber
        : C.green;

    return row(
      [
        footerCell(
          "server.rack",
          "ISP / 厂商",
          shortISP(exit.isp),
          C.blue
        ),

        footerCell(
          "house.fill",
          "属性类型",
          exit.kind,
          typeColor
        ),

        footerCell(
          "checkmark.shield.fill",
          "纯净评分",
          purity.score + "分",
          purityColor
        ),

        footerCell(
          "shield.lefthalf.filled",
          "风险等级",
          risk,
          riskColor
        ),

        footerCell(
          "arrow.clockwise",
          "更新时间",
          timeLabel(now),
          C.purple
        )
      ],
      {
        height: 39,
        padding: [3, 4],
        gap: 0
      }
    );
  }

  const dashboard = col(
    [
      header(),

      row(
        [
          localCard(),
          proxyCard()
        ],
        {
          height: 100,
          gap: 6,
          alignItems: "start"
        }
      ),

      row(
        [
          serviceCard("流媒体解锁", "play.rectangle.fill", media, C.blue),
          serviceCard("AI 解锁检测", "sparkles", ai, C.purple)
        ],
        {
          height: 133,
          gap: 6,
          alignItems: "start"
        }
      ),

      footer()
    ],
    {
      height: 341,
      padding: [8, 8],
      gap: 6,
      backgroundColor: C.dashboard,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: C.dashboardBorder
    }
  );

  return {
    type: "widget",
    padding: 8,
    gap: 0,
    backgroundColor: C.root,
    refreshAfter: new Date(
      Date.now() + REFRESH_MINUTES * 60 * 1000
    ).toISOString(),
    children: [
      dashboard,
      spacer()
    ]
  };
}

function palette() {
  const adaptive = (light, dark) => ({
    light: light,
    dark: dark
  });

  return {
    root: adaptive("#EEF2FA", "#05070B"),

    dashboard: adaptive("#F7FAFF", "#071126"),
    dashboardBorder: adaptive("#C5D5F2", "#263B72"),

    card: adaptive("#FFFFFF", "#101A30"),
    proxyTop: adaptive("#F5F1FF", "#1A1335"),
    proxyBottom: adaptive("#EEF6FF", "#0A1B35"),
    cardBorder: adaptive("#B8C9EA", "#29487D"),

    tileBg: adaptive("#F2F6FF", "#15223B"),
    tileIconBg: adaptive("#E4EEFF", "#1B3158"),
    tileBorder: adaptive("#B8CCEF", "#2A4B83"),

    scoreTrack: adaptive("#D7E3EC", "#252A3D"),
    scoreDarkLine: adaptive("#BCCBD7", "#353B52"),
    scoreGlow: adaptive("#16E884", "#16E884"),
    scoreLeft: adaptive("#17D97B", "#22F28B"),
    scoreRight: adaptive("#E84C68", "#FF496D"),

    footerDivider: adaptive("#C7D4E9", "#30456F"),

    text: adaptive("#14213A", "#EEF4FF"),
    subtext: adaptive("#435572", "#B7C6E5"),
    muted: adaptive("#6E7F99", "#7F91B4"),

    blue: adaptive("#2379D7", "#64AEFF"),
    blueSoft: adaptive("#DCEBFF", "#183A70"),

    purple: adaptive("#7458D8", "#AA91FF"),
    purpleSoft: adaptive("#E8E1FF", "#30255C"),

    green: adaptive("#1A9F64", "#55D59A"),
    greenSoft: adaptive("#DDF7EA", "#153F35"),

    amber: adaptive("#B77910", "#FFC75B"),
    amberSoft: adaptive("#FFF0CE", "#4E3816"),

    red: adaptive("#D8424E", "#FF7680"),
    redSoft: adaptive("#FFE1E5", "#49212B"),

    netflix: adaptive("#E50914", "#FF4E5A"),
    disney: adaptive("#2677D9", "#75B5FF"),
    spotify: adaptive("#1DB954", "#1ED760"),
    tiktok: adaptive("#111827", "#FFFFFF"),
    youtube: adaptive("#FF0033", "#FF4A4A"),
    prime: adaptive("#1677CC", "#78B7FF"),

    chatgpt: adaptive("#1F2937", "#EAF0FF"),
    claude: adaptive("#C86B35", "#FFA06E"),
    gemini: adaptive("#6D6FE8", "#9CA7FF"),
    deepseek: adaptive("#1D6FD8", "#5EA8FF"),
    grok: adaptive("#111827", "#F1F5FF"),
    perplexity: adaptive("#0787A6", "#61D8FF")
  };
}

/**
 * 当前代理纯净度 SVG
 *
 * 已验证：
 * - 0 分：指示点在最左
 * - 50 分：指示点在顶部
 * - 100 分：指示点在最右
 * - 数字绘制在弧线之后，不会被遮挡
 */
function purityGaugeSVG(score, colors) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));

  const cx = 75;
  const cy = 85;
  const rx = 55;
  const ry = 55;

  const theta = Math.PI - Math.PI * value / 100;
  const px = cx + rx * Math.cos(theta);
  const py = cy - ry * Math.sin(theta);

  const safeTrack = svgColor(colors.track, "#252A3D");
  const safeLeft = svgColor(colors.left, "#22F28B");
  const safeRight = svgColor(colors.right, "#FF496D");
  const safeGlow = svgColor(colors.glow, "#16E884");
  const safeText = svgColor(colors.text, "#22F28B");
  const safeMuted = svgColor(colors.muted, "#7F91B4");
  const safeDarkLine = svgColor(colors.darkLine, "#353B52");

  const leftDash =
    value >= 99.9
      ? "100 0"
      : Math.max(0.1, value).toFixed(1) + " 100";

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="112" viewBox="0 0 150 112">',

    '<defs>',
    '<filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">',
    '<feGaussianBlur stdDeviation="2.1" result="blur"/>',
    '<feMerge>',
    '<feMergeNode in="blur"/>',
    '<feMergeNode in="SourceGraphic"/>',
    '</feMerge>',
    '</filter>',
    '</defs>',

    '<ellipse cx="75" cy="58" rx="48" ry="37" fill="none" stroke="' + safeDarkLine + '" stroke-width="4" opacity="0.23"/>',
    '<ellipse cx="75" cy="58" rx="39" ry="30" fill="none" stroke="' + safeDarkLine + '" stroke-width="2" opacity="0.18"/>',

    '<path d="M20 85 A55 55 0 0 1 130 85" fill="none" stroke="' + safeTrack + '" stroke-width="9" stroke-linecap="round" opacity="0.75"/>',

    '<path d="M20 85 A55 55 0 0 1 130 85" fill="none" stroke="' + safeRight + '" stroke-width="8.2" stroke-linecap="round" opacity="0.95"/>',

    '<path d="M20 85 A55 55 0 0 1 130 85" fill="none" stroke="' + safeGlow + '" stroke-width="13" stroke-linecap="round" pathLength="100" stroke-dasharray="' + leftDash + '" opacity="0.16"/>',

    '<path d="M20 85 A55 55 0 0 1 130 85" fill="none" stroke="' + safeLeft + '" stroke-width="8.4" stroke-linecap="round" pathLength="100" stroke-dasharray="' + leftDash + '" opacity="1"/>',

    '<circle cx="' + px.toFixed(2) + '" cy="' + py.toFixed(2) + '" r="6.5" fill="' + safeGlow + '" opacity="0.20"/>',
    '<circle cx="' + px.toFixed(2) + '" cy="' + py.toFixed(2) + '" r="4.2" fill="' + safeLeft + '" filter="url(#softGlow)" opacity="1"/>',

    '<text x="75" y="61" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="30" font-weight="850" fill="' + safeText + '">' + Math.round(value) + '</text>',
    '<text x="75" y="75" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="10" font-weight="760" fill="' + safeMuted + '">/100</text>',
    '<text x="75" y="90" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="10" font-weight="760" fill="' + safeMuted + '">纯净评分</text>',

    '</svg>'
  ].join("");
}

function svgDataURI(svg) {
  return "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(svg)
      .replace(/'/g, "%27")
      .replace(/"/g, "%22");
}

function svgColor(value, fallback) {
  const color = clean(value);

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    return color;
  }

  return fallback;
}

function detectScheme(ctx, env) {
  const raw = clean(
    pick(
      env.COLOR_SCHEME,
      ctx.colorScheme,
      ctx.appearance,
      ctx.theme,
      ctx.widgetColorScheme
    )
  ).toLowerCase();

  if (
    raw.includes("dark") ||
    raw.includes("深") ||
    raw === "2"
  ) {
    return "dark";
  }

  return "light";
}

function resolveAdaptiveColor(value, scheme) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return scheme === "dark"
      ? clean(value.dark) || clean(value.light)
      : clean(value.light) || clean(value.dark);
  }

  return "";
}

function clean(value) {
  return String(
    value === undefined || value === null ? "" : value
  ).trim();
}

function numberInRange(value, min, max, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function pick() {
  for (let index = 0; index < arguments.length; index += 1) {
    const value = arguments[index];

    if (
      value !== undefined &&
      value !== null &&
      clean(value) !== ""
    ) {
      return value;
    }
  }

  return "";
}

function getAt(object, path) {
  const keys = String(path).split(".");
  let current = object;

  for (let index = 0; index < keys.length; index += 1) {
    if (
      !current ||
      typeof current !== "object" ||
      !(keys[index] in current)
    ) {
      return "";
    }

    current = current[keys[index]];
  }

  return current === undefined || current === null
    ? ""
    : current;
}

function truthy(value) {
  return value === true ||
    value === 1 ||
    ["true", "1", "yes", "y"].includes(
      clean(value).toLowerCase()
    );
}

function parseTrace(value) {
  const output = {};

  String(value || "")
    .split(/\r?\n/)
    .forEach(function (line) {
      const position = line.indexOf("=");

      if (position > 0) {
        output[line.slice(0, position).trim()] =
          line.slice(position + 1).trim();
      }
    });

  return output;
}

function countryCode(value) {
  const code = clean(value).toUpperCase();

  return /^[A-Z]{2}$/.test(code) ? code : "";
}

function flag(value) {
  const code = countryCode(value);

  if (!code) {
    return "";
  }

  return (
    String.fromCodePoint(code.charCodeAt(0) + 127397) +
    String.fromCodePoint(code.charCodeAt(1) + 127397)
  );
}

function parseExit(data) {
  if (!data || typeof data !== "object") {
    return {};
  }

  const ip = clean(
    pick(
      data.ip,
      data.query,
      data.ip_address,
      getAt(data, "location.ip")
    )
  );

  if (!ip) {
    return {};
  }

  const flags = {
    datacenter: truthy(
      pick(
        data.is_datacenter,
        getAt(data, "security.is_datacenter"),
        getAt(data, "company.is_datacenter")
      )
    ),

    proxy: truthy(
      pick(
        data.is_proxy,
        getAt(data, "security.is_proxy"),
        getAt(data, "security.proxy")
      )
    ),

    vpn: truthy(
      pick(
        data.is_vpn,
        getAt(data, "security.is_vpn"),
        getAt(data, "security.vpn")
      )
    ),

    tor: truthy(
      pick(
        data.is_tor,
        getAt(data, "security.is_tor"),
        getAt(data, "security.tor")
      )
    ),

    abuser: truthy(
      pick(
        data.is_abuser,
        getAt(data, "security.is_abuser")
      )
    )
  };

  const rawType = clean(
    pick(
      getAt(data, "company.type"),
      getAt(data, "connection.type"),
      getAt(data, "asn.type")
    )
  ).toLowerCase();

  let kind = "住宅 IP";

  if (flags.tor) {
    kind = "Tor";
  } else if (flags.proxy || flags.vpn) {
    kind = "代理出口";
  } else if (
    flags.datacenter ||
    rawType.includes("hosting") ||
    rawType.includes("datacenter")
  ) {
    kind = "数据中心";
  } else if (
    truthy(data.is_mobile) ||
    rawType.includes("mobile")
  ) {
    kind = "移动网络";
  }

  const rawCountry = clean(
    pick(
      getAt(data, "location.country"),
      data.country_name,
      data.country
    )
  );

  return {
    ip: ip,
    city: clean(
      pick(
        getAt(data, "location.city"),
        data.city,
        getAt(data, "location.region"),
        data.region,
        "未知城市"
      )
    ),
    region: clean(
      pick(
        getAt(data, "location.region"),
        data.regionName,
        data.region
      )
    ),
    country:
      rawCountry.length === 2
        ? ""
        : rawCountry,
    countryCode: countryCode(
      pick(
        getAt(data, "location.country_code"),
        data.country_code,
        data.countryCode,
        rawCountry.length === 2 ? rawCountry : ""
      )
    ),
    isp: clean(
      pick(
        getAt(data, "company.name"),
        getAt(data, "connection.isp"),
        getAt(data, "connection.org"),
        getAt(data, "asn.name"),
        data.org,
        data.organization,
        "未知组织"
      )
    ),
    kind: kind,
    flags: flags
  };
}

function parseLocalExit(data) {
  if (!data || typeof data !== "object") {
    return {};
  }

  const ip = clean(
    pick(
      data.query,
      data.ip,
      data.ip_address,
      getAt(data, "location.ip")
    )
  );

  if (!ip) {
    return {};
  }

  const countryCodeValue = countryCode(
    pick(
      data.countryCode,
      data.country_code,
      getAt(data, "location.country_code")
    )
  );

  const country = clean(
    pick(
      data.country,
      data.country_name,
      getAt(data, "location.country")
    )
  );

  const region = clean(
    pick(
      data.regionName,
      data.region,
      getAt(data, "location.region")
    )
  );

  const city = clean(
    pick(
      data.city,
      getAt(data, "location.city")
    )
  );

  return {
    ip: ip,
    country: country,
    countryCode: countryCodeValue,
    region: region,
    city: city,
    isp: clean(pick(data.isp, data.org, data.organization)),
    label: formatLocalArea(countryCodeValue, country, region, city)
  };
}

function formatLocalArea(countryCodeValue, country, region, city) {
  const cc = countryCode(countryCodeValue);
  let r = clean(region);
  let c = clean(city);

  r = r
    .replace(/省$/g, "")
    .replace(/市$/g, "")
    .replace(/壮族自治区$/g, "")
    .replace(/回族自治区$/g, "")
    .replace(/维吾尔自治区$/g, "")
    .replace(/自治区$/g, "");

  c = c.replace(/市$/g, "");

  if (cc === "CN" || country.includes("中国")) {
    if (["北京", "上海", "天津", "重庆"].includes(r)) {
      return r;
    }

    if (r && c && r !== c) {
      return r + c;
    }

    return c || r || "中国";
  }

  if (c && r && c !== r) {
    return r + " " + c;
  }

  return c || r || country || "直连地区未知";
}

function providerFromText(value) {
  const text = clean(value).toLowerCase();

  if (!text) {
    return {
      full: "",
      short: ""
    };
  }

  if (text.includes("cloudflare")) {
    return {
      full: "Cloudflare DNS",
      short: "CF"
    };
  }

  if (text.includes("google")) {
    return {
      full: "Google DNS",
      short: "谷歌"
    };
  }

  if (text.includes("quad9")) {
    return {
      full: "Quad9 DNS",
      short: "Q9"
    };
  }

  if (text.includes("opendns") || text.includes("cisco")) {
    return {
      full: "OpenDNS",
      short: "Open"
    };
  }

  if (text.includes("adguard")) {
    return {
      full: "AdGuard DNS",
      short: "AdG"
    };
  }

  if (
    text.includes("alidns") ||
    text.includes("alibaba") ||
    text.includes("aliyun") ||
    text.includes("alicloud")
  ) {
    return {
      full: "AliDNS",
      short: "阿里"
    };
  }

  if (
    text.includes("dnspod") ||
    text.includes("tencent")
  ) {
    return {
      full: "DNSPod",
      short: "腾讯"
    };
  }

  if (text.includes("114dns") || text.includes("114 dns")) {
    return {
      full: "114DNS",
      short: "114"
    };
  }

  if (text.includes("nextdns")) {
    return {
      full: "NextDNS",
      short: "Next"
    };
  }

  if (
    text.includes("chinanet") ||
    text.includes("china telecom") ||
    text.includes("telecom") ||
    text.includes("ctc") ||
    text.includes("中国电信") ||
    text.includes("电信")
  ) {
    return {
      full: "中国电信 DNS",
      short: "电信"
    };
  }

  if (
    text.includes("china mobile") ||
    text.includes("cmcc") ||
    text.includes("cmnet") ||
    text.includes("cmi") ||
    text.includes("中国移动") ||
    text.includes("移动")
  ) {
    return {
      full: "中国移动 DNS",
      short: "移动"
    };
  }

  if (
    text.includes("china unicom") ||
    text.includes("unicom") ||
    text.includes("cucc") ||
    text.includes("中国联通") ||
    text.includes("联通")
  ) {
    return {
      full: "中国联通 DNS",
      short: "联通"
    };
  }

  if (
    text.includes("cernet") ||
    text.includes("education")
  ) {
    return {
      full: "中国教育网 DNS",
      short: "教育"
    };
  }

  return {
    full: "",
    short: ""
  };
}

function shortDNSGeo(value) {
  const fullProvider = providerFromText(value);

  if (fullProvider.short) {
    return fullProvider.short;
  }

  const parts = clean(value)
    .split(/[-,，|/ ]+/)
    .map(function (item) {
      return clean(item);
    })
    .filter(Boolean);

  for (let index = 0; index < parts.length; index += 1) {
    const provider = providerFromText(parts[index]);

    if (provider.short) {
      return provider.short;
    }
  }

  return "未知";
}

function chooseDNSProvider(baseDNS, verifiedDNS) {
  const base = baseDNS || {
    full: "",
    short: ""
  };

  const verified = verifiedDNS || {
    ok: false,
    full: "",
    short: ""
  };

  const verifiedProvider = providerFromText(
    [verified.full, verified.short, verified.geo, verified.ip].join(" ")
  );

  if (verifiedProvider.short) {
    return verifiedProvider;
  }

  const baseProvider = providerFromText(
    [base.full, base.short].join(" ")
  );

  if (baseProvider.short) {
    return baseProvider;
  }

  if (verified.ok && verified.short && !isWeakDNSLabel(verified.short)) {
    return {
      full: verified.full,
      short: dnsTinyLabel(verified.short)
    };
  }

  if (base.short && !isWeakDNSLabel(base.short)) {
    return {
      full: base.full,
      short: dnsTinyLabel(base.short)
    };
  }

  if (verified.ok && verified.short) {
    return {
      full: verified.full,
      short: dnsTinyLabel(verified.short)
    };
  }

  return {
    full: "未知 DNS",
    short: "未知"
  };
}

function isWeakDNSLabel(value) {
  return [
    "",
    "系统",
    "网关",
    "自定义",
    "自定",
    "未知",
    "IPv6"
  ].includes(clean(value));
}

function dnsTinyLabel(value) {
  const name = clean(value);
  const provider = providerFromText(name);

  if (provider.short) {
    return provider.short;
  }

  const map = {
    "Cloudflare": "CF",
    "Cloudflare DNS": "CF",
    "CF": "CF",

    "Google": "谷歌",
    "Google DNS": "谷歌",
    "谷歌": "谷歌",

    "AliDNS": "阿里",
    "Ali": "阿里",
    "阿里": "阿里",

    "DNSPod": "腾讯",
    "Pod": "腾讯",
    "腾讯": "腾讯",

    "OpenDNS": "Open",
    "Open": "Open",

    "AdGuard": "AdG",
    "AdG": "AdG",

    "Quad9": "Q9",
    "Q9": "Q9",

    "114DNS": "114",
    "114": "114",

    "NextDNS": "Next",
    "Next": "Next",

    "中国电信 DNS": "电信",
    "电信": "电信",

    "中国移动 DNS": "移动",
    "移动": "移动",

    "中国联通 DNS": "联通",
    "联通": "联通",

    "中国教育网 DNS": "教育",
    "教育": "教育",

    "网关 DNS": "网关",
    "网关": "网关",

    "系统": "系统",
    "自定义": "自定",
    "自定": "自定",
    "未知": "未知",
    "IPv6": "IPv6"
  };

  if (map[name]) {
    return map[name];
  }

  if (name.length <= 4) {
    return name;
  }

  return "未知";
}

function purityScore(exit) {
  const flags = (exit && exit.flags) || {};
  let score = 100;

  if (flags.datacenter) score -= 12;
  if (flags.proxy) score -= 15;
  if (flags.vpn) score -= 15;
  if (flags.abuser) score -= 25;
  if (flags.tor) score -= 55;

  score = Math.max(0, Math.min(100, score));

  return {
    score: score,
    risk: 100 - score
  };
}

function riskLevel(exit, purity) {
  const flags = (exit && exit.flags) || {};

  if (
    flags.tor ||
    flags.abuser ||
    purity.risk >= 70
  ) {
    return "高风险";
  }

  if (
    flags.proxy ||
    flags.vpn ||
    flags.datacenter ||
    purity.risk >= 35
  ) {
    return "中风险";
  }

  return "低风险";
}

function toneColor(tone, colors) {
  if (tone === "green") {
    return colors.green;
  }

  if (tone === "red") {
    return colors.red;
  }

  return colors.amber;
}

function parseIPv4(ip) {
  const parts = clean(ip).split(".");

  if (parts.length !== 4) {
    return null;
  }

  const values = parts.map(Number);

  if (
    values.some(function (value) {
      return !Number.isInteger(value) || value < 0 || value > 255;
    })
  ) {
    return null;
  }

  return values;
}

function isPrivateIPv4(ip) {
  const parts = parseIPv4(ip);

  if (!parts) {
    return false;
  }

  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function isCGNATIPv4(ip) {
  const parts = parseIPv4(ip);

  return Boolean(
    parts &&
    parts[0] === 100 &&
    parts[1] >= 64 &&
    parts[1] <= 127
  );
}

function isPublicIPv4(ip) {
  const parts = parseIPv4(ip);

  return Boolean(
    parts &&
    !isPrivateIPv4(ip) &&
    !isCGNATIPv4(ip) &&
    parts[0] !== 0 &&
    parts[0] !== 127 &&
    parts[0] < 224 &&
    !(parts[0] === 169 && parts[1] === 254)
  );
}

function detectNAT(localIP, exitIP) {
  if (isCGNATIPv4(localIP)) {
    return {
      label: "CGNAT",
      tone: "amber"
    };
  }

  if (
    isPrivateIPv4(localIP) &&
    isPublicIPv4(exitIP)
  ) {
    return {
      label: "Open",
      tone: "green"
    };
  }

  if (isPublicIPv4(localIP)) {
    return {
      label: "Open",
      tone: "green"
    };
  }

  if (isPrivateIPv4(localIP)) {
    return {
      label: "NAT",
      tone: "amber"
    };
  }

  return {
    label: "未知",
    tone: "red"
  };
}

function detectDNSProvider(addresses) {
  const list = Array.isArray(addresses)
    ? addresses.map(clean).filter(Boolean)
    : [clean(addresses)].filter(Boolean);

  if (list.length === 0) {
    return {
      full: "系统 DNS",
      short: "系统"
    };
  }

  const providers = [
    {
      full: "Cloudflare DNS",
      short: "CF",
      values: [
        "1.1.1.1",
        "1.0.0.1",
        "2606:4700:4700::1111",
        "2606:4700:4700::1001",
        "2606:4700:4700::64",
        "2606:4700:4700::6400"
      ]
    },
    {
      full: "Google DNS",
      short: "谷歌",
      values: [
        "8.8.8.8",
        "8.8.4.4",
        "2001:4860:4860::8888",
        "2001:4860:4860::8844"
      ]
    },
    {
      full: "Quad9 DNS",
      short: "Q9",
      values: [
        "9.9.9.9",
        "149.112.112.112",
        "2620:fe::fe",
        "2620:fe::9"
      ]
    },
    {
      full: "OpenDNS",
      short: "Open",
      values: [
        "208.67.222.222",
        "208.67.220.220",
        "2620:119:35::35",
        "2620:119:53::53"
      ]
    },
    {
      full: "AdGuard DNS",
      short: "AdG",
      values: [
        "94.140.14.14",
        "94.140.15.15",
        "94.140.14.15",
        "94.140.15.16",
        "2a10:50c0::ad1:ff",
        "2a10:50c0::ad2:ff"
      ]
    },
    {
      full: "AliDNS",
      short: "阿里",
      values: [
        "223.5.5.5",
        "223.6.6.6",
        "2400:3200::1",
        "2400:3200:baba::1"
      ]
    },
    {
      full: "DNSPod",
      short: "腾讯",
      values: [
        "119.29.29.29",
        "119.28.28.28",
        "2402:4e00::"
      ]
    },
    {
      full: "114DNS",
      short: "114",
      values: [
        "114.114.114.114",
        "114.114.115.115",
        "240c::6666",
        "240c::6644"
      ]
    },
    {
      full: "NextDNS",
      short: "Next",
      values: [
        "45.90.28.",
        "45.90.30.",
        "2a07:a8c0:"
      ]
    }
  ];

  for (let i = 0; i < list.length; i += 1) {
    const raw = normalizeDNS(list[i]);

    for (let p = 0; p < providers.length; p += 1) {
      const provider = providers[p];

      for (let v = 0; v < provider.values.length; v += 1) {
        const value = provider.values[v].toLowerCase();

        if (
          raw === value ||
          raw.startsWith(value)
        ) {
          return provider;
        }
      }
    }
  }

  for (let i = 0; i < list.length; i += 1) {
    const raw = normalizeDNS(list[i]);

    if (
      raw.startsWith("fe80:") ||
      isPrivateIPv4(raw)
    ) {
      return {
        full: "本地网关 DNS",
        short: "网关"
      };
    }
  }

  return {
    full: "自定义 DNS",
    short: "自定义"
  };
}

function normalizeDNS(value) {
  return clean(value)
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/%.*$/, "");
}

function gatewayLabel(value) {
  const gateway = clean(value);

  if (!gateway || gateway === "未获取") {
    return "—";
  }

  return gateway;
}

function shortISP(value) {
  const isp = clean(value);

  if (!isp || isp === "未知组织") {
    return "未知";
  }

  if (isp.length <= 12) {
    return isp;
  }

  const words = isp.split(/\s+/);

  if (words.length > 1) {
    return words[0];
  }

  return isp.slice(0, 11) + "…";
}

function randomAlphaNum(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";

  for (let index = 0; index < length; index += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

function timeLabel(date) {
  return (
    String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0")
  );
}

function dateLabel(date) {
  const weekday = [
    "日",
    "一",
    "二",
    "三",
    "四",
    "五",
    "六"
  ][date.getDay()];

  return (
    String(date.getMonth() + 1).padStart(2, "0") +
    "/" +
    String(date.getDate()).padStart(2, "0") +
    " 周" +
    weekday
  );
}