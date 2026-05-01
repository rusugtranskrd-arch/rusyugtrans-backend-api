# RusYugTrans Backend API

Production backend API for RusYugTrans.

## Stack

- Node.js 20
- Express
- PostgreSQL 16
- Docker Compose
- GitHub Actions deployment over SSH

## Local Development

```bash
cp .env.example .env
npm ci
npm run dev
```

Health endpoints:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

## Checks

```bash
npm run lint
npm test
```

## Production

Server:

```text
yc-user@103.76.55.173
```

Project path:

```text
/home/yc-user/backend-api
```

Production URL:

```text
https://api.rusyugtrans.online
```

Deployment is triggered by push to `main` through GitHub Actions. The server script is `deploy.sh`.

Manual production commands:

```bash
cd /home/yc-user/backend-api
./deploy.sh
docker-compose ps
docker logs --tail=50 rusyugtrans-api
docker logs --tail=50 rusyugtrans-postgres
tail -n 30 ~/monitor.log
```
