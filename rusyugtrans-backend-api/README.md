# RusYugTrans Backend API

Node.js Express backend API.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Health endpoint:

```bash
curl http://localhost:3000/health
```

## Production

Use Docker Compose:

```bash
cp .env.example .env
docker compose up -d --build
```

See [DEPLOY.md](DEPLOY.md) for Ubuntu 22.04 deployment instructions.
