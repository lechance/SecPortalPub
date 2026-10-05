# SecPortal 安装指南（分发包）

本文面向**客户 / 实施人员**：从 [GitHub Release](https://github.com/lechance/SecPortalPub/releases) 下载
`secportal-<版本>-<平台>-<架构>.tar.gz`（如 `secportal-1.2.1-linux-x64.tar.gz`）后在 Linux 服务器上完成安装上线。
不需要 git、npm、编译工具或系统 Node —— 运行时与全部依赖都随包交付。

## 一、环境要求

| 项 | 要求 |
| --- | --- |
| 操作系统 | 与打包平台一致的 Linux（当前包为 linux-x64 / glibc；换架构或发行版需重新打包） |
| 权限 | root 或 sudo（systemd、特权端口 1812/1813） |
| 时间 | NTP 同步（授权有效期、认证票据、计费时段都依赖本机时间） |
| 端口 | 443（反代公网入口）；1812/1813 UDP、50100 UDP 仅放行 NAS 网段 |
| 硬件 | 建议 1 核 / 1GB 起（访客并发认证为主的轻负载） |

## 二、安装

```bash
# 1. 校验并解压（tar.gz 的 sha256 见 Release 说明页）
sha256sum secportal-<版本>-<平台>-<架构>.tar.gz   # 对照 Release 说明里的值
tar xzf secportal-<版本>-<平台>-<架构>.tar.gz
cd secportal-<版本>-<平台>-<架构>
sha256sum -c MANIFEST.sha256                  # 包内文件完整性（启动器每次启动也自校验）

# 2. 落地到 /opt/secportal
sudo useradd --system --home /opt/secportal --shell /usr/sbin/nologin secportal
sudo mkdir -p /opt/secportal && sudo rsync -a ./ /opt/secportal/
sudo chown -R secportal:secportal /opt/secportal

# 3. 配置
sudo mkdir -p /etc/secportal
sudo install -m 600 deploy/secportal.env.example /etc/secportal/secportal.env
sudo sh -c 'openssl rand -hex 32'             # 三个密钥各执行一次，逐行填入下文变量
sudo vi /etc/secportal/secportal.env
```

`/etc/secportal/secportal.env` 至少改这四项：

```bash
SECPORTAL_SERVER_PUBLIC_URL=https://portal.你的域名   # 必改：NAS 跳转 / WISPr / 探针都用它拼 URL
SECPORTAL_SECURITY_TICKET_SECRET=<随机hex32>         # 三个密钥都不能用默认值
SECPORTAL_SECURITY_PASSWORD_PEPPER=<随机hex32>
SECPORTAL_RADIUS_DEFAULT_SECRET=<随机hex32>
SECPORTAL_SMS_PROVIDER=mock                          # 上线前换 aliyun / tencent / submail 并填密钥
```

```bash
# 4. 启动（单元模板 ExecStart 已指向包内运行时，直接安装）
sudo install -m 644 deploy/secportal.service /etc/systemd/system/secportal.service
sudo systemctl daemon-reload && sudo systemctl enable --now secportal
journalctl -u secportal -f        # 看到 RADIUS / Portal / HTTP 启动横幅即成功
```

> **不要**用系统 `node xxx` 启动：字节码绑定包内 V8 版本，入口必须是
> `runtime/bin/node start.js`（systemd 模板已写好）。启动器会校验
> `.build-stamp.json` 与 `MANIFEST.sha256`，文件被改动会拒绝启动。

## 三、反向代理（HTTPS）

模板：`deploy/nginx-secportal.conf.example`（内附 caddy 等价写法）。三个必查点：

1. 转发 `X-Forwarded-For` / `X-Forwarded-Proto`（后台 Cookie 的 Secure 标记依赖它）；
2. `/api/events`（后台实时指标 SSE）必须 `proxy_buffering off` 并放宽 `proxy_read_timeout`；
3. `SECPORTAL_SERVER_PUBLIC_URL` 必须是对外 **https** 地址，改完 `systemctl restart secportal`。

防火墙：公网只开 443；8080 绑 127.0.0.1 不对外；1812/1813/50100 只放行 NAS 网段。

## 四、首次启动清单

空库首启会自动建表并写入**演示数据**，上线前逐项处理（登录后台 `https://域名/`）：

1. 立即修改默认管理员 `admin / admin123`。
2. **激活授权（必须先做，后续步骤都依赖它）**：发行包出厂**未授权** ——
   后台可登录浏览（会标记「授权受限」），但**登记真实 NAS、新增用户会被拒绝**，
   短信 / SSO / 无感知 / VLAN 等授权功能同样不可用。
   后台「系统配置 → 产品授权」→ 复制机器指纹 → 按仓库 README 中的联系方式发回签发 → 粘贴授权码激活。
   想先体验可申请 30 天试用授权（1 NAS / 5 用户 / 10 在线）。
   容器 / 虚拟机建议设 `SECPORTAL_LICENSE_MACHINE_CODE` 钉死指纹（主机名 / 网卡变动会使已激活授权失效）。
3. 删除 4 台演示 NAS（`HQ-WLC-01`、`HQ-WLC-02`、`CAMPUS-GW`、`LOCAL-DEMO`，密钥均为 `testing123`），登记真实设备并**每台独立密钥**；保持「未登记 NAS 拒绝」。
4. 删除 / 停用演示账号（`vip001`、`staff001`、`guest001`）与示例策略；历史演示日志用「系统状态 → 数据维护」清理。
5. 短信通道切真实（`aliyun` / `tencent` / `submail`）并发送测试短信 —— `mock` 会把验证码直接回显给访客（短信是授权功能，需先激活授权）。
6. NAS 实测认证：访客应跳到 https 门户页，认证放行后可上网。

## 五、备份与恢复

```bash
# 立即手动备份（快照 + 授权密钥 + 配置；无需停服，WAL 下安全）
/opt/secportal/deploy/backup.sh /var/backups/secportal

# 定时：root crontab 加一行（每天 03:30）
30 3 * * * /opt/secportal/deploy/backup.sh /var/backups/secportal >> /var/log/secportal-backup.log 2>&1
```

- 脚本优先使用**包内** `runtime/bin/node`，客户机无系统 Node 也能跑。
- 恢复：新机装好包与配置 → 快照 `secportal.db` 放回 `data/secportal.db`、`license-keys.json`（如备份中有）放回 `data/` → 启动即还原。
- **`license-keys.json` 与备份目录含密钥，务必离线妥善保管**（丢失后换机需重新签发）。

## 六、升级

```bash
sudo systemctl stop secportal
tar xzf secportal-<新版本>-<平台>-<架构>.tar.gz
cd secportal-<新版本>-<平台>-<架构> && sha256sum -c MANIFEST.sha256
sudo rsync -a --delete --exclude=data --exclude=logs ./ /opt/secportal/
sudo systemctl start secportal && journalctl -u secportal -f
```

- `data/`（数据库、授权）、`logs/`、`/etc/secportal/secportal.env` 不在升级包内，覆盖不会丢失。
- **换平台或换 Node 版本的包必须整包同平台重打**，不能只替换部分文件（字节码绑定 V8）。
- 回滚：换回上一版包同样操作后启动。

## 七、常见问题

| 现象 | 处理 |
| --- | --- |
| 启动报 `完整性校验失败` | 包内文件被改动过（或传输损坏）：重新解压覆盖；改配置请用 `config/local.json` 或 `/etc/secportal/secportal.env`（不在校验清单内） |
| 启动报 `运行时不匹配` | 用了系统 node 或错架构：必须 `runtime/bin/node start.js`，且打包平台 = 目标平台 |
| 启动报端口被占用 | 服务不做端口回退：`ss -ltnp` 找占用者，释放或改 `SECPORTAL_SERVER_PORT` |
| NAS 认证无响应 | 检查 1812/1813 防火墙、NAS 上的服务器 IP 与共享密钥、后台「未登记 NAS 拒绝」设置；服务端日志 `journalctl -u secportal` |
| 访客被跳到内网地址 | `SECPORTAL_SERVER_PUBLIC_URL` 未配或不是 https |
| 后台实时指标不刷新 | 反代没关 `/api/events` 的 buffering |
| 报障需要版本/构建信息 | 后台「系统状态 → 运行环境 · 软件版本」，或 `GET /api/public/health` 返回的 `build` 字段（如 `1.0.0+gc77793a`，`.dirty` 表示含未提交改动） |
