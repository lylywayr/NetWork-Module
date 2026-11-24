# 内购解锁（通用）

## 说明

三种通用解锁，装上一个模块覆盖大部分订阅制 App：

- 苹果 `verifyReceipt`：把失败状态改成成功并补一条收据，处理老式收据校验。
- RevenueCat 权益接口：`entitlements` / `subscriptions` 全量置为已购，覆盖大量订阅类 App。
- App 自有接口：模板规则，把 `[[APP_API_HOST]]` 换成目标域名并取消注释即可。

只对可 MITM 的接口有效；StoreKit2 本地验签、服务端严格校验收据的场景无法绕过。

## 文件

- `IAPUnlock.sgmodule`
- `iap-unlock.js`

## 安装

- Surge：导入 `https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-IAPUnlock/IAPUnlock.sgmodule`
- 安装后按需编辑 `[Script]` 里的第三条「内购解锁-业务」，填入自己的 `APP_API_HOST`

## 参数

无。目标域名写在模块文件里，改完重新加载配置生效。

## 来源

- 自研，未引用上游脚本。
- 依赖仅为 Surge HTTP 脚本 API。

## 维护记录

- 2026-11-24：补 README（此前只有模块与脚本，缺说明）。
