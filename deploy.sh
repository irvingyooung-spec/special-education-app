#!/bin/bash
set -e

echo "========== 特殊教育平台一键部署脚本 =========="
echo ""

# 1. 配置npm国内镜像
echo "[1/9] 配置npm国内镜像..."
npm config set registry https://registry.npmmirror.com

# 2. 进入项目目录
echo "[2/9] 进入项目目录..."
cd /www/wwwroot/special-education-app

# 3. 拉取最新代码
echo "[3/9] 拉取最新代码..."
git pull origin master

# 4. 清理并安装依赖
echo "[4/9] 安装npm依赖（约5分钟，请等待）..."
rm -rf node_modules package-lock.json .next
npm install

# 5. 构建项目
echo "[5/9] 构建Next.js项目（约3分钟，请等待）..."
npm run build

# 6. 创建环境变量文件
echo "[6/9] 创建环境变量文件..."
cat > .env.local << 'EOF'
DEEPSEEK_API_KEY=sk-dfe7a261398f4732852d4a4107316169
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
EOF

# 7. 安装PM2并启动项目
echo "[7/9] 安装PM2进程管理器..."
npm install -g pm2

echo "[8/9] 启动项目..."
pm2 delete tezhu-helper 2>/dev/null || true
pm2 start npm --name "tezhu-helper" -- start
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 8. 安装Nginx并配置反向代理
echo "[9/9] 配置Nginx反向代理..."
apt-get install -y nginx 2>/dev/null || true

cat > /etc/nginx/sites-available/tezhu-helper << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/tezhu-helper /etc/nginx/sites-enabled/tezhu-helper
nginx -t && systemctl restart nginx

echo ""
echo "========== 部署完成！=========="
echo ""
echo "项目已启动，可以通过以下地址访问："
echo "  http://47.116.134.145"
echo ""
echo "宝塔面板地址："
echo "  https://47.116.134.145:10195/386e83f8"
echo "  用户名：qpfqrgxv"
echo "  密码：887ffeda"
echo ""
echo "默认管理员账号：admin / changeme123"
echo "登录后请立即修改密码！"
echo ""
