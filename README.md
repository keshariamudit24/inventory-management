# Inventory Management System with end-to-end DevOps pipeline

Node.js (Express) REST API + PostgreSQL on Neon (via Prisma) + Docker/Nginx + GitHub Actions CI/CD.

## Project structure
```
prisma/schema.prisma        Product and Order models
src/app.js                  Express API
public/index.html           Frontend (Home, Report, Add Product, Place Order)
tests/api.test.js           API tests (node:test + supertest)
Dockerfile                  App image
docker-compose.yml          App + Nginx reverse proxy
nginx/nginx.conf            Proxy config
scripts/deploy.sh           Server-side deploy + rollback
.github/workflows/ci-cd.yml Test -> scan -> build -> deploy
```

## Run locally
1. Create a project at https://neon.tech and copy the connection string.
2. `cp .env.example .env` and paste the connection string as `DATABASE_URL`.
3. `npm install` (commit the generated `package-lock.json`)
4. `npx prisma db push` (creates the tables in Neon)
5. `npm start` and open http://localhost:3000

## Run with Docker (Nginx on port 80)
```
docker compose up --build
```
Open http://localhost

## API
| Method | Path | Purpose |
|---|---|---|
| GET | /health | Health check |
| GET / POST | /api/products | List / add products |
| PUT / DELETE | /api/products/:id | Update stock / delete |
| GET / POST | /api/orders | List / place orders (reduces stock) |

## CI/CD pipeline
- **test**: Postgres service container, `prisma db push`, `npm test`, `npm audit`
- **build**: builds the Docker image and pushes it to GHCR (`ghcr.io/<owner>/<repo>:<sha>`)
- **deploy** (optional): SSH to a server with Docker, runs `deploy.sh`, checks `/health`, rolls back on failure

To enable deploy, add repository **variable** `DEPLOY_ENABLED=true` and these **secrets**:
`SSH_HOST`, `SSH_USER`, `SSH_KEY` (private key), `DATABASE_URL` (Neon connection string).
The server needs Docker with Compose v2 and `curl`.
