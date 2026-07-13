# 扫描全能王

## 说明
这是 `扫描全能王.sgmodule` 的整理目录，作为普通功能模块保留。

## 使用方式
- 在 `Surge` 中导入 `扫描全能王.sgmodule`。
- 打开 `扫描全能王` App。
- 在 App 内任意页面停留几秒，自动触发 `get_user_attribute` 抓取请求。
- 收到 `Cookie 获取成功` 通知后，定时任务会按计划执行抽奖。

导入链接：
- `surge:///install-module?url=https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-%E6%89%AB%E6%8F%8F%E5%85%A8%E8%83%BD%E7%8E%8B/%E6%89%AB%E6%8F%8F%E5%85%A8%E8%83%BD%E7%8E%8B.sgmodule`

## 文件
- `扫描全能王.sgmodule`
- `camscanner.cookie.js`
- `camscanner.js`
- `camscanner.png`

## 说明补充
- 抓取请求：`/user/cs/get_user_attribute`
- 定时任务：默认每天 `10:15`
- 清除 Cookie：`camscanner_clear=true`
- 调试开关：`camscanner_debug=true`

## 来源
- 上游目录：`MaYIHEI/paperclip/app/camscanner`
- 脚本来源：`https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.cookie.js`
- 脚本来源：`https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.js`
- 图标来源：`https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png`
