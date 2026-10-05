# SecPortal · WiFi 访客认证平台（发行版）

SecPortal 是一个自带 **RADIUS 服务器**的无线访客认证（Captive Portal）平台。访客连上 SSID 后自动弹出认证页，可选择**一键上网 / 短信认证 / 账号认证 / 广告认证**等方式接入；管理后台统一管理 NAS 设备、账号、认证策略、在线会话与日志审计，并提供 AD / LDAP 域认证、按组下发 VLAN、无感知认证、SAML / 微信 / 钉钉扫码登录等企业能力。

本仓库是**发行仓库**：只提供预编译安装包与安装文档，不含源码。

## 下载

1. 前往 [Releases](https://github.com/lechance/SecPortalPub/releases) 下载最新版
   `secportal-<版本>-linux-x64.tar.gz`（当前为 `secportal-1.2.1-linux-x64.tar.gz`，约 57.5 MB）；
2. 核对 sha256 —— 每个 Release 说明页都会给出校验值。

## 安装

按 [INSTALL.md](./INSTALL.md) 操作，四个步骤：

```bash
tar xzf secportal-1.2.1-linux-x64.tar.gz && cd secportal-1.2.1-linux-x64
sha256sum -c MANIFEST.sha256                 # 包内文件完整性
sudo rsync -a ./ /opt/secportal/             # 落地（详见文档，含建用户与改属主）
sudo install -m 644 deploy/secportal.service /etc/systemd/system/ && sudo systemctl enable --now secportal
```

不需要 git、npm、编译工具或系统 Node —— 运行时与全部依赖随包交付；启动器每次启动会校验
`MANIFEST.sha256` 与 `.build-stamp.json`，文件被改动会拒绝启动。
完整流程（HTTPS 反代、首次启动清单、备份与升级）见 [INSTALL.md](./INSTALL.md)。

## 产品授权

发行包出厂**未授权**：

- 后台可正常登录浏览，页面会标记「授权受限」；
- **登记真实 NAS、新增用户会被拒绝**，短信 / SSO / 无感知 / VLAN 等授权功能不可用；
- 30 天试用（1 NAS / 5 用户 / 10 在线）与正式授权（标准版 / 企业版）均需签发。

获取授权：

1. 登录后台「**系统配置 → 产品授权**」，复制**机器指纹**（形如 `00B6-AC5C-B24C-C06F`）；
2. 通过下方微信联系，说明用途与所需版本；
3. 收到授权码（`ON1.…`）后在同一页粘贴激活，立即生效。

<img src="wechat-zhang.png" alt="微信联系二维码" width="260">

## 问题反馈

安装或认证异常请附上以下信息通过微信反馈：

- 版本 / 构建号：后台「系统状态 → 运行环境 · 软件版本」，或 `GET /api/public/health`
  返回的 `build` 字段（如 `1.2.1+g25fbeab`，`.dirty` 表示含未提交改动）；
- 日志片段：`journalctl -u secportal -n 200 --no-pager`。
