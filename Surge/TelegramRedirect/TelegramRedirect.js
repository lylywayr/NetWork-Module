#!name=Telegram 链接重定向
#!desc=将 t.me 链接重定向到指定的 Telegram 客户端。CLIENT 可选：Telegram、Swiftgram、Turrit、iMe、Nicegram、Lingogram。
#!arguments=CLIENT=Telegram

[Script]
Telegram 链接重定向 = type=http-request,pattern=^https?:\/\/t\.me\/.+,script-path=Telegram-Redirect.js,argument=CLIENT=%CLIENT%,timeout=10,engine=jsc

[MITM]
hostname = %APPEND% t.me