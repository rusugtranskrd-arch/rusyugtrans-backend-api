# Production Deployment

Target server:

```text
yc-user@103.76.55.173
```

Project path:

```text
/home/yc-user/backend-api
```

Domain:

```text
api.rusyugtrans.online
```

## GitHub Actions

Every push to `main` runs:

```text
npm ci
npm run lint
npm test
SSH deploy
```

The SSH deploy step connects to the server and runs:

```bash
cd /home/yc-user/backend-api
./deploy.sh
```

Required GitHub secret:

```text
SSH_KEY
```

`SSH_KEY` must contain the private key authorized for `yc-user` on `103.76.55.173`.

## Server Files

The production `.env` file must exist on the server and must not be committed:

```bash
cd /home/yc-user/backend-api
cp .env.example .env
nano .env
```

Minimum values:

```text
NODE_ENV=production
PORT=3000
SERVICE_NAME=rusyugtrans-api
CORS_ORIGIN=*
JSON_LIMIT=1mb
FORM_LIMIT=1mb
POSTGRES_DB=rusyugtrans
POSTGRES_USER=rusyugtrans
POSTGRES_PASSWORD=change_me_strong_password
DATABASE_URL=postgresql://rusyugtrans:change_me_strong_password@postgres:5432/rusyugtrans
```

Use a strong production password and keep `DATABASE_URL` in sync with the PostgreSQL variables.

## Manual Deploy

```bash
ssh yc-user@103.76.55.173
cd /home/yc-user/backend-api
chmod +x deploy.sh monitor.sh
./deploy.sh
```

`deploy.sh` saves the current commit, pulls `origin/main`, rebuilds containers, checks `http://127.0.0.1:3000/health`, and rolls back to the previous commit if the health check fails.

## Operations

```bash
cd /home/yc-user/backend-api
docker-compose ps
docker logs --tail=50 rusyugtrans-api
docker logs --tail=50 rusyugtrans-postgres
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
curl https://api.rusyugtrans.online/health
```

## Monitoring

Run `monitor.sh` every minute from cron:

```cron
* * * * * /home/yc-user/backend-api/monitor.sh
```

The script writes to:

```text
~/monitor.log
```

It checks `http://127.0.0.1:3000/health` and restarts `rusyugtrans-api` if the check fails.

## Nginx

The API container publishes only to localhost:

```text
127.0.0.1:3000:3000
```

Nginx should proxy HTTPS traffic for `api.rusyugtrans.online` to:

```text
http://127.0.0.1:3000
```
