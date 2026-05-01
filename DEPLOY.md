# Deploy to Ubuntu 22.04

Target server: `89.169.142.232`  
Domain: `api.rusyugtrans.online`

## 1. DNS

Create an `A` record:

```text
api.rusyugtrans.online -> 89.169.142.232
```

Wait until DNS resolves:

```bash
dig +short api.rusyugtrans.online
```

## 2. Install server packages

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg nginx ufw certbot python3-certbot-nginx
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 3. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

## 4. Upload project

```bash
sudo mkdir -p /opt/rusyugtrans-api
sudo chown -R "$USER":"$USER" /opt/rusyugtrans-api
```

Upload the contents of this `backend-api` directory to `/opt/rusyugtrans-api`.

Create production env:

```bash
cd /opt/rusyugtrans-api
cp .env.example .env
nano .env
```

Recommended values:

```text
NODE_ENV=production
PORT=3000
SERVICE_NAME=rusyugtrans-api
CORS_ORIGIN=https://api.rusyugtrans.online
JSON_LIMIT=1mb
FORM_LIMIT=1mb
```

## 5. Start API

```bash
cd /opt/rusyugtrans-api
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/health
```

## 6. Configure Nginx

Create `/etc/nginx/sites-available/api.rusyugtrans.online`:

```nginx
server {
    listen 80;
    server_name api.rusyugtrans.online;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/api.rusyugtrans.online /etc/nginx/sites-enabled/api.rusyugtrans.online
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Enable HTTPS

```bash
sudo certbot --nginx -d api.rusyugtrans.online
sudo systemctl status certbot.timer
```

Check from outside:

```bash
curl https://api.rusyugtrans.online/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "rusyugtrans-api",
  "environment": "production"
}
```

## 8. Operations

Update and restart:

```bash
cd /opt/rusyugtrans-api
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f api
```

Stop:

```bash
docker compose down
```

Restart:

```bash
docker compose restart api
```
