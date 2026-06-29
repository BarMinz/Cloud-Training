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

echo "==> Generating secret key (if not already set)..."
CONF_FILE="/etc/conf.d/cloud-training-api"
if [ ! -f "$CONF_FILE" ] || ! grep -q "^SECRET_KEY=" "$CONF_FILE"; then
    mkdir -p /etc/conf.d
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    echo "SECRET_KEY=$SECRET_KEY" >> "$CONF_FILE"
    chmod 600 "$CONF_FILE"
    echo "   Generated new SECRET_KEY → $CONF_FILE"
else
    echo "   SECRET_KEY already exists in $CONF_FILE"
fi

echo "==> Creating backend startup wrapper..."
WRAPPER="/usr/local/sbin/cloud-training-api-start"
cat > "$WRAPPER" << WEOF
#!/bin/sh
# Sources the protected conf.d file so SECRET_KEY reaches the process
# without being embedded in the world-readable init script.
. /etc/conf.d/cloud-training-api
export SECRET_KEY
cd $BACKEND_DIR
exec /usr/bin/python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
WEOF
chmod 700 "$WRAPPER"

echo "==> Creating backend OpenRC service..."
cat > "$BACKEND_SERVICE" << 'EOF'
#!/sbin/openrc-run
name="cloud-training-api"
description="Cloud Training FastAPI backend"
command="/usr/local/sbin/cloud-training-api-start"
pidfile="/run/cloud-training-api.pid"
command_background=true
output_log="/var/log/cloud-training-api.log"
error_log="/var/log/cloud-training-api.log"

depend() {
    need net
}
EOF
chmod +x "$BACKEND_SERVICE"

echo "==> Building LAMP base Docker image..."
docker build -t lamp-base:latest "$(dirname "$0")/lamp-base/"

echo "==> Starting services..."
rc-update add cloud-training-api default 2>/dev/null || true
rc-update add nginx default 2>/dev/null || true
rc-service cloud-training-api restart
rc-service nginx restart

echo ""
echo "✓ Deployment complete!"
echo "  Frontend : http://79.108.163.7/"
echo "  Health   : http://79.108.163.7/api/health"
echo "  Logs     : /var/log/cloud-training-api.log"
