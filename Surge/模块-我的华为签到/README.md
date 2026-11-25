# 我的华为 · 积分签到

## 说明

华为手机升级鸿蒙后，「我的华为」App 的会员中心每天可以签到领**积分**，积分在华为商城下单能抵扣、也能在会员中心「积分兑」换东西。这个模块解决的是「每天手动点一下」：你在 App 里手动点**一次**，模块把那次真实请求学下来，之后每天定时原样重发。

华为没有公开签到接口，社区也没有能直接用的现成脚本，所以这里不做「硬猜接口」，做**抓包学习 + 定时重放**。模块本身不含任何凭证，学到的内容只存在你本机 `$persistentStore`。

## 背景：为什么是「学一次」，不是内置接口

- 积分规则页（`m.vmall.com/point/rules`）写得很明确：签到打卡在**我的华为 App**，华为商城的微信小程序**没有签到**。
- 公开脚本仓库（GitHub / Gitee 全量检索「华为签到 / 我的华为 / vmall sign / huawei checkin」）没有可用的华为签到实现；能跑的是**荣耀商城**那套（`openapi-cn.c.honor.com`，无签名无风控），跟华为不是一回事。
- 华为侧的请求带 `hwid` 会话 + 设备指纹（`hwmeta`）+ 参数签名，接口名和签名规则都随版本变。内置一套写死的接口，版本一升就废，还得跟着 App 逆向。
- 因此模块只做两件事：**把你自己客户端发的请求完整记下来**，**按原样再发一次**。签名、指纹、编号全部来自真实客户端，不需要我们复刻算法。

## 文件

- `我的华为签到.sgmodule` — 模块入口
- `huawei-learn.js` — 学习器（http-response，只读）
- `huawei-signin.js` — 定时重放（cron，当天成功过就跳过）
- `huawei-status.js` — 体检：列模板 / 暂停 / 删除 / 清空
- `huawei-har-replay.py` — 给 NAS / 青龙用：从 HAR 提取模板并重放（纯标准库）

## 安装

- Surge：导入 [我的华为签到.sgmodule](https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-%E6%88%91%E7%9A%84%E5%8D%8E%E4%B8%BA%E7%AD%BE%E5%88%B0/%E6%88%91%E7%9A%84%E5%8D%8E%E4%B8%BA%E7%AD%BE%E5%88%B0.sgmodule)

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-%E6%88%91%E7%9A%84%E5%8D%8E%E4%B8%BA%E7%AD%BE%E5%88%B0/%E6%88%91%E7%9A%84%E5%8D%8E%E4%B8%BA%E7%AD%BE%E5%88%B0.sgmodule
```

## 参数

```text
CronExp:5 8 * * *,Learn:1,DryRun:0,Action:list
```

CronExp：每天几点重放（Cron 表达式，默认 08:05）

Learn：1=每次在 App 里点签到都重新学一遍（模板永远是最新的）；0=只重放已存模板

DryRun：1=只列出要发哪些请求、不发包。第一次接好线先演练一次

Action：体检脚本的动作，`list` 列模板 / `clear` 清空重学 / `del:3` 删第 3 条 / `off:3` 暂停 / `on:3` 恢复

## 用法

1. 华为手机连 WiFi，HTTP 代理指向这台 iPhone 上的 Surge。Surge 里打开「允许局域网连接」，并在华为手机上装好 Surge 的 CA 证书 —— 华为需要额外走一次「设置 → 安全 → 更多安全设置 → 加密和凭据 → 从存储设备安装」。
2. 打开「我的华为」→ 我的 → 会员中心 → 点一次「签到」。正常会弹出「我的华为签到 · 已学到请求」，模板入库。
3. 长按 `huawei-status` 运行一次，确认模板清单和 Cookie 都在；把 `DryRun` 设 1 演练一次，再设回 0。
4. 之后每天 `CronExp` 自动跑，结果用 Surge 通知回报。

抓不到时按顺序排查：

- 先在 `huawei-status` 里看是不是 0 条。0 条通常是 MITM 没命中：把 `[MITM]` 里注释掉的 `*.hicloud.com`、`*.dbankcloud.cn`、`*.huawei.com` 那行打开再点一次签到。
- 有模板但重放失败：多半是华为签了 `signature`/时间戳。打开 App 逛一下会员中心（不用点签到），让 `huawei-learn` 刷新模板与 Cookie，再重放。
- 部分华为系统域名有证书固定，MITM 会让那一条请求失败。只影响抓包，不影响 App 本身签到。

## 不想用 Surge 的路线

在电脑或华为手机上用 Reqable / Charles 抓一次签到，导出 HAR，丢给 `huawei-har-replay.py`：

```bash
python3 huawei-har-replay.py cap.har              # 看候选请求
python3 huawei-har-replay.py cap.har --save tpl.json
python3 huawei-har-replay.py --run tpl.json --dry # 演练
python3 huawei-har-replay.py --run tpl.json       # 真跑
```

放飞牛 NAS 上定时：`5 8 * * * python3 /path/huawei-har-replay.py --run /path/tpl.json`。Cookie 失效时用 `--cookie-file cookies.txt`（每行 `host=完整Cookie`）刷新，不用重新抓包。

## 来源

- 类型：自研
- 无上游模块，不建 `上游/` 目录
- 依赖接口 / 框架接口形态来自华为官方积分规则页（`https://m.vmall.com/point/rules`）与公开检索结论：

- 积分获取渠道：我的华为 App 的签到打卡、好评、任务、活动；运动健康 App 运动达标
- 积分用途：华为商城下单抵扣、会员中心「积分兑」兑换
- 华为商城微信小程序（`wx208389d90830e5b7`）**无签到**，别再往里找

## 维护记录

- 2026-11-25：首版。学习器 + 定时重放 + 体检 + HAR 重放工具。
