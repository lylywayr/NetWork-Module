# 小米抽奖

## 说明
这是 `小米抽奖.sgmodule` 的整理目录，作为普通功能模块保留。

## 使用方式
- 在 `Surge` 中导入 `小米抽奖.sgmodule`。

导入链接：
- `surge:///install-module?url=https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-%E5%B0%8F%E7%B1%B3%E6%8A%BD%E5%A5%96/%E5%B0%8F%E7%B1%B3%E6%8A%BD%E5%A5%96.sgmodule`

抓取路径：
- 打开小米商城 App。
- 进入 `狂欢礼` 或对应抽奖活动页。
- 命中请求后会保存 `Cookie` 与活动配置，之后可执行定时签到。

模块内容：
- `小米抽奖 Cookie`：负责抓取活动 Cookie 与活动配置。
- `小米抽奖签到`：每天 `08:30` 执行任务和抽奖。

## 文件
- `小米抽奖.sgmodule`
- `milottery.js`
- `mishop.png`

## 来源
- 模块片段来源：`MaYIHEI/paperclip`
- 脚本来源：`https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/milottery/milottery.js`
- 图标来源：`https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png`
