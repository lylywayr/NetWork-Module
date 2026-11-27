# 今日水印相机 解锁

## 说明

尝试解锁今日水印相机的会员权益，只改响应、不碰登录与订单：

- `/next/app/vip/info`、`/next/app/h5/vip/info`、`/next/app/h5/vip/rollup/v2`：整段回放 2023 年抓到的会员密文（`result`，240 字节），App 本地解密后按会员模型渲染
- `/next/app/remove/watermark/counts`：去水印次数回放另一段密文（72 字节）
- 若某版本改成明文下发：按容器语义置真会员字段、模板条目去锁、广告容器清空
- 无论回放与否，真实密文的长度与前 24 字符都会写进脚本日志，密钥轮换或密文结构变化时可以据此继续分析

会员信息是服务端加密的：响应体是 `{"code":..,"result":"<base64>"}`，App 用包内的模型解密实现还原。本模块用的是社区验证过的两段密文回放，不依赖本地密钥；如果某天 App 换了密钥或模型结构，日志里会看到长度变化，`Replay` 关掉后不影响正常使用。

## 文件

- `今日水印相机解锁.sgmodule`
- `vip-rewrite.js`

## 安装

- Surge：导入 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-%E4%BB%8A%E6%97%A5%E6%B0%B4%E5%8D%B0%E7%9B%B8%E6%9C%BA%E8%A7%A3%E9%94%81/%E4%BB%8A%E6%97%A5%E6%B0%B4%E5%8D%B0%E7%9B%B8%E6%9C%BA%E8%A7%A3%E9%94%81.sgmodule`
- 装好后杀掉 App 重进，进「我的 → 会员」页触发 `vip/info`；脚本日志过滤 `[XHVIP]` 看是否命中

## 参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `Replay` | `1` | 回放会员密文；`0` 只记录不改写，适合先确认接口与密文长度 |
| `Debug` | `1` | 输出 `[XHVIP]` 日志（命中 URL、密文长度、前 24 字符） |

## 来源

- 类型：二改
- 上游仓库：`89996462/Quantumult-X`（`ycdz/JRSYXJ.js`、`ycdz/JRSYXJ1.js`，今日水印相机 3.0.35，2023-07-31）
- 许可证：未声明（上游注明「仅供学习交流，禁止商业用途」）
- 上游原版：保存在本目录 `上游/`，清单与 sha256 见 `上游/SOURCE.md`
- 本仓库改动：上游只做静态替换，没有日志与开关；本仓加了 Replay/Debug 参数、命中日志、明文兜底改写，并把接口范围扩到 h5 vip 与 rollup。密文本身未改动。

## 已知限制

- 会员密文与 App 版本/密钥绑定，回放的密文来自 3.0.35；若 3.0.5xx 的解密密钥已轮换，会员页可能仍显示未开通（日志里 `cipher len` 与 240 不同就是信号）
- 不处理苹果内购校验（`/next/app/order/apple/receipts`），服务端二次校验无法绕过
- 只覆盖 `today.xhey.top`、`h5.xhey.top`、`test.xhey.top` 与四个历史 IP；若日志里没有 `hit`，说明请求走了 `net-cloud.xhey.top`，需要把该域名补进 MITM 与 pattern

## 维护记录

- 2026-11-27：新建。密文取自上游 3.0.35 版本；接口路径按 3.0.500 脱壳包核对（`app/vip/info`、`app/remove/watermark/counts`、`app/order/apple/receipts`）。node 语法检查与四组 fixture（vip 替换、counts 替换、Replay=0 透传、明文兜底）通过。
