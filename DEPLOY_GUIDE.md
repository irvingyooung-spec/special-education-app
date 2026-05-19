# 部署指南：宝塔面板 + 轻量服务器

> 本文档面向非技术用户，每步都有详细说明。

---

## 一、购买服务器

### 推荐配置
| 项目 | 建议 |
|------|------|
| 平台 | 阿里云 或 腾讯云 |
| 类型 | 轻量应用服务器 |
| 地域 | 离你用户最近的城市（如华东选上海，华南选广州）|
| 配置 | 2核2G 或 2核4G，带宽 3-5M |
| 系统 | Ubuntu 22.04 LTS（64位）|
| 价格 | 约 100-200 元/年（新用户首年优惠）|

### 购买后操作
1. 在控制台找到「重置密码」，设置 root 密码
2. 记录服务器的**公网 IP 地址**
3. 在安全组/防火墙中放行端口：`80`、`443`、`22`、`3000`

---

## 二、安装宝塔面板

### 通过 SSH 连接服务器
```bash
ssh root@<你的服务器IP>
```

### 安装宝塔
```bash
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

安装完成后，终端会显示：
- 宝塔面板地址（如 `http://123.45.67.89:8888`）
- 默认用户名和密码

**务必保存这些信息！**

### 登录宝塔面板
1. 浏览器打开宝塔地址
2. 输入用户名密码登录
3. 首次登录会弹出「推荐安装套件」，选择：
   - **Nginx**（Web服务器）
   - 其他可以不装

---

## 三、安装 Node.js

1. 宝塔左侧菜单 → **软件商店**
2. 搜索 **"Node"** 或 **"Node.js版本管理器"**
3. 安装 **Node.js 版本管理器**
4. 打开版本管理器，安装 **Node.js 20.x**

---

## 四、部署项目

### 方式 1：Git 部署（推荐）

1. 宝塔左侧 → **终端**
2. 执行以下命令：

```bash
# 进入 wwwroot 目录
cd /www/wwwroot

# 克隆代码（替换为你的仓库地址）
git clone https://github.com/irvingyooung-spec/special-education-app.git

# 进入项目目录
cd special-education-app

# 安装依赖
npm install

# 构建项目
npm run build
```

### 方式 2：手动上传

1. 在本地电脑把项目打包成 zip
2. 宝塔左侧 → **文件**
3. 进入 `/www/wwwroot`
4. 上传 zip 文件，然后解压
5. 终端进入目录，执行 `npm install && npm run build`

---

## 五、配置环境变量

1. 宝塔 → **文件** → 进入 `/www/wwwroot/special-education-app`
2. 新建文件 `.env.local`
3. 填入以下内容（替换为你自己的 API Key）：

```
DEEPSEEK_API_KEY=sk-你的API密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

---

## 六、用 PM2 启动项目

1. 宝塔左侧 → **软件商店** → 安装 **PM2管理器**
2. 打开 PM2 管理器
3. 点击「添加项目」：
   - 启动文件：`/www/wwwroot/special-education-app/node_modules/.bin/next`
   - 或者更简单：启动文件选 `npm`，参数填 `start`
   - 项目目录：`/www/wwwroot/special-education-app`
   - 名称：`tezhu-helper`
4. 保存启动

### 验证是否运行
```bash
curl http://localhost:3000
```
有返回 HTML 就说明运行成功了。

---

## 七、Nginx 反向代理

让外网可以通过 80/443 端口访问你的网站。

1. 宝塔左侧 → **网站** → **添加站点**
   - 域名：如果有域名就填，没有可以先填服务器 IP
   - 根目录：`/www/wwwroot/special-education-app`
2. 站点创建后，点击「设置」→ **反向代理**
3. 添加反向代理：
   - 目标 URL：`http://127.0.0.1:3000`
   - 发送域名：`$host`
4. 保存

现在用浏览器访问 `http://你的服务器IP` 应该能看到网站了。

---

## 八、配置域名和 HTTPS（SSL）

### 如果你有域名

1. 在域名服务商处添加 **A 记录**：
   - 主机记录：`@`
   - 记录值：你的服务器 IP
2. 宝塔 → **网站** → 你的站点 → **设置**
3. **域名管理** → 添加你的域名
4. **SSL** → 选择「Let's Encrypt」→ 申请证书 → 开启强制 HTTPS

### 如果没有域名

可以直接用 IP 访问，但无法配置 HTTPS。建议买一个域名（约 30-60 元/年）。

---

## 九、数据备份

**非常重要！** SQLite 数据库在 `data/database.db`。

### 自动备份方案

1. 宝塔 → **计划任务**
2. 添加任务：
   - 任务类型：**备份目录**
   - 执行周期：每天 凌晨 2 点
   - 备份目录：`/www/wwwroot/special-education-app/data`
   - 保存到：阿里云 OSS 或本地磁盘

或者手动备份：
```bash
# 导出数据库备份
cp /www/wwwroot/special-education-app/data/database.db /backup/database-$(date +%Y%m%d).db
```

---

## 十、后续更新代码

当你修改了代码并推送到 GitHub 后，在服务器上执行：

```bash
cd /www/wwwroot/special-education-app
git pull
npm install
npm run build
pm2 restart tezhu-helper
```

---

## 常见问题

### Q: 访问网站显示 502 错误？
A: PM2 没有启动，或 Nginx 反向代理配置错误。检查 PM2 状态。

### Q: 登录后页面空白？
A: 检查 `.env.local` 是否配置正确，特别是 `DEEPSEEK_API_KEY`。

### Q: 数据丢失了？
A: 检查 `data/database.db` 文件是否存在。如果误删了，用备份恢复。

### Q: 怎么修改默认管理员密码？
A: 登录后台后，在「账号管理」页面修改。

---

## 需要帮助？

如果在某一步卡住了，告诉我：
1. 你在做第几步？
2. 遇到了什么错误提示？
3. 截图发给我（如果有）
