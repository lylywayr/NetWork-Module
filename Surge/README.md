# Surge

## 说明
这里是 Surge 客户端模块目录。

本次命名统一按目录前缀区分用途：

- 面板-...：面板展示或信息面板类模块
- 脚本-...：脚本订阅、任务订阅、插件中心适配这类脚本型模块
- 模块-...：普通功能模块

当前仍然遵循你的整理边界：

- 自动化影视仓 不整理到这里
- 自动规则集 不整理到这里
- 去广告仓 不整理到这里

## 使用方式
- 进入对应目录。
- 查看该目录下的 README.md。
- 导入目录中的 .sgmodule 文件。

## 面板目录
- `面板-Apple定位修改`
- `面板-IP检测`
- `面板-NetStatusPanel`
- `面板-Panel`
- `面板-Surge信息`
- `面板-Timecard`
- `面板-中兴光猫`
- `面板-分组面板`
- `面板-刷新DNS`
- `面板-接口信息`
- `面板-流媒体检测`
- `面板-网络信息`
- `面板-网络信息增强`
- `面板-订阅信息`
- `面板-轻量流媒体检测`

## 脚本目录
- `脚本-Cookie`
- `脚本-Script`
- `脚本-Sub-Store`
- `脚本-Task`

## 模块目录
- `模块-52pojie`
- `模块-Baidu_index`
- `模块-Bilibili`
- `模块-Bilibili-Login`
- `模块-BiliBiliAdsLite`
- `模块-BiliBiliDailyBonus`
- `模块-block-you`
- `模块-BodianMusic`
- `模块-DNS-QUIC`
- `模块-DoH`
- `模块-GitHubPrivate`
- `模块-GitHubRawAutoCDN`
- `模块-GoogleRedirects`
- `模块-GoogleRewrite`
- `模块-Hide-VPN-Icon`
- `模块-HuazhuCheckin`
- `模块-IAPUnlock`
- `模块-IPPure`
- `模块-IPPurity`
- `模块-JD_Price`
- `模块-macOS-Translate`
- `模块-NoOTA_Lite`
- `模块-PingMeCheckin`
- `模块-QiMaoXiaoShuo`
- `模块-SkipProxy`
- `模块-smzdm`
- `模块-SURGE-GPT-AI`
- `模块-SwiptLoopback`
- `模块-Talkatone`
- `模块-TelegramRedirect`
- `模块-TeleSwiftgram`
- `模块-TeleTurrit`
- `模块-TestFlight`
- `模块-Tieba`
- `模块-TodayWatermarkCamera`
- `模块-Weibo`
- `模块-WPSCheckin`
- `模块-WPSSign`
- `模块-Wuai_Checkin`
- `模块-WulingSign`
- `模块-X-search`
- `模块-XiaoCan`
- `模块-XiaocanCheckin`
- `模块-YanxuanCheckin`
- `模块-去广告合并`
- `模块-小米抽奖`
- `模块-扫描全能王`
- `模块-菜鸟包裹去广告`

## 维护说明
- `Rules/` 放不属于任何模块的独立规则清单，见 `Rules/README.md`。
- 各目录来源信息仍写在各自 README.md 中。
- 这次只做命名归类和缺失模块补回，不纳入被排除的仓库内容。
