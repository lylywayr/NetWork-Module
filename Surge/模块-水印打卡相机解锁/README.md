# 水印打卡相机 解锁

## 说明

解锁水印打卡相机的 VIP 会员，并清空接口返回里的广告位：

- 用户态字段：`data.identity.vip` / `is_vip` / `member` 置真，`vip_expire_time` 等过期时间推到 2099-12-31
- 模板条目：`templates[]`、`list[]` 里的 `is_vip` / `locked` / `need_pay` 去锁，`price` 归零，付费水印模板直接可点
- 广告位：返回体里的 `ads` / `banner` / `splash` 数组与对象置空，`has_ad` / `show_ad` 置假

改写按「所在容器语义」判断：用户信息容器里 `vip` 置 1，模板列表容器里 `vip` 置 0，所以同一套字段名在不同层不会互相打架。会员解锁后 App 自身的开屏与信息流广告开关通常也随 `vip` 关闭；若某些版本仍残留第三方广告，叠加通用广告 SDK 拦截即可。

适用 App：

- 水印打卡相机（`com.laoyapi.waterfv`，App Store id6479684172，v2.0 / 2026-09-18）
- 水印打卡相机 · 打卡记录（`com.xiangji.super`，id6505012233，v1.2）
- 共用同一套 `ThinkPHP /api/visitors/*` 后端的同源白牌水印相机

已知限制：只对可 MITM 的 JSON 接口有效；App 若改用 StoreKit2 本地验签或把会员状态做成签名密文，本模块需要重新抓包。今日水印相机（com.xhey.XCamera）、马克水印相机（com.ai.marki）、水印相机（com.tencent.watermarkcamera）的会员不在这套接口上，本模块不处理。

## 文件

- `水印打卡相机解锁.sgmodule`
- `解锁-响应改写.js`

## 安装

- Surge：导入 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-%E6%B0%B4%E5%8D%B0%E6%89%93%E5%8D%A1%E7%9B%B8%E6%9C%BA%E8%A7%A3%E9%94%81/%E6%B0%B4%E5%8D%B0%E6%89%93%E5%8D%A1%E7%9B%B8%E6%9C%BA%E8%A7%A3%E9%94%81.sgmodule`
- 深链：`surge:///install-module?url=<同上，URL 编码>`

装好后杀掉 App 重进，未登录先登录一次（脚本挂在 `sign-in` 响应上，登录之后会员态才刷新）。验证方法：Surge → 脚本 → 脚本日志，过滤 `[WMC]`，出现 `vip=1 time=1 ... => vip=1` 即命中；再进 App 的会员页看是否显示已开通。

## 参数

脚本顶部常量，改文件即可：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `VIP_EXPIRE` | `4102415999` | 会员到期时间戳（2099-12-31 23:59:59） |
| `DEBUG` | `true` | 是否往 Surge 脚本日志打 `[WMC]` 命中路径 |

## 来源

- 类型：二改
- 上游仓库：`89996462/Quantumult-X`、`afengye/QX`
- 上游文件：
  - https://raw.githubusercontent.com/89996462/Quantumult-X/main/ycdz/jslynhapi.js（2024-06-08，水印相机 v1.3）
  - https://raw.githubusercontent.com/89996462/Quantumult-X/main/ycdz/1yifanxinmei.js（2024-10-08，水印相机 v1.0.1）
  - https://raw.githubusercontent.com/afengye/QX/main/syxj.js、`syxj2.js`、`syxj3.js`（2024-08）
- 许可证：未声明（上游仅注明「仅供学习交流，禁止商业用途」）
- 上游原版：上游脚本保存在本目录 `上游/`，字节未改，清单与 sha256 见 `上游/SOURCE.md`
- 本仓库改动：上游用正则替换固定字段名（`vip":\d`、`vip_expire_time`），换版本就失效；本仓改为按容器语义递归改写，覆盖 `vip` / `is_vip` / `member` / `vip_end_time` 等多种字段名，并新增模板去锁、价格归零、广告容器清空与内嵌 JSON 字符串下钻。接口地址与 App 版本已从单一域名扩展到三个同源域名。

## 维护记录

- 2026-11-27：新建。上游接口 `water-fv.jslynhapi.com` / `supercamera.yifanxinmei.com` / `watermarking.xitengtech.cn` 当日实测仍在响应（ThinkPHP，`sign` + `timestamp` + `random` 签名校验，未带签名返回 `{"code":412,"message":"未发现签名字符串"}`），因此响应侧改写仍然有效。
- 2026-11-27：node 语法检查通过，四组 fixture（单层会员、模板列表、广告容器、终身会员）回归通过。
