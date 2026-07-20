# GitHub Private Raw

用于 Surge 访问 GitHub / Gist 私有 raw 资源。

## 模块链接

```text
https://raw.githubusercontent.com/lylywayr/NetWork-Module/main/Surge/%E6%A8%A1%E5%9D%97-GitHubPrivate/GitHubPrivate.sgmodule
```

## 参数

- `USERNAME`: GitHub 用户名或组织名，默认 `lylywayr`
- `TOKEN`: GitHub Personal Access Token，至少需要目标私有仓库 `Contents: Read-only`

## 注意

需要在 Surge 中启用 MitM 并信任证书。启用后，私有仓库 raw 链接可以使用不带 token 的普通地址。
