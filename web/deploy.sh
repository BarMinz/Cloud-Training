#!/bin/sh
# Cloud Training — one-command deploy script for Alpine Linux
# Run as root: sh deploy.sh
set -e

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"
NGINX_CONF="$(cd "$(dirname "$0")" && pwd)/nginx.conf"
WEBROOT="/var/www/cloud-training"
BACKEND_SERVICE="/etc/init.d/cloud-training-api"

echo "==> Installing system dependencies..."
apk update -q
apk add -q nginx python3 py3-pip nodejs npm

echo "==> Installing Python backend dependencies..."
pip3 install -q --break-system-packages -r "$BACKEND_DIR/requirements.txt"

echo "==> Installing and building React frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build --silent

echo "==> Deploying frontend to $WEBROOT..."
mkdir -p "$WEBROOT"
cp -r "$FRONTEND_DIR/dist/." "$WEBROOT/"

echo "==> Configuring nginx..."
mkdir -p /etc/nginx/http.d
cp "$NGINX_CONF" /etc/nginx/http.d/cloud-training.conf
# Remove default site if present
rm -f /etc/nginx/http.d/default.conf

echo "==> Creating backend OpenRC service..."
cat > "$BACKEND_SERVICE" << 'EOF'
#!/sbin/openrc-run
name="cloud-training-api"
description="Cloud Training FastAPI backend"
command="/usr/bin/python3"
command_args="-m uvicorn main:app --host 127.0.0.1 --port 8000"
directory="BACKEND_DIR_PLACEHOLDER"
pidfile="/run/cloud-training-api.pid"
command_background=true
output_log="/var/log/cloud-training-api.log"
error_log="/var/log/cloud-training-api.log"

depend() {
    need net
}
EOF
# Replace placeholder with real path
sed -i "s|BACKEND_DIR_PLACEHOLDER|$BACKEND_DIR|g" "$BACKEND_SERVICE"
chmod +x "$BACKEND_SERVICE"

echo "==> Starting services..."
rc-update add cloud-training-api default 2>/dev/null || true
rc-update add nginx default 2>/dev/null || true
rc-service cloud-training-api restart
rc-service nginx restart

echo ""
echo "✓ Deployment complete!"
echo "  Frontend : http://79.108.163.7/"
echo "  API docs : http://79.108.163.7/api/docs"
echo "  Logs     : /var/log/cloud-training-api.log"
