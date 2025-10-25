# Jelou Monorepo (Customers API, Orders API, Lambda Orchestrator)

## Levantamiento rápido (local)


1. Copiar las variables de entorno:
- `cp customers-api/.env.example customers-api/.env`
- `cp orders-api/.env.example orders-api/.env`
2. Construir e inicia servicios:
- `docker-compose build`
- `docker-compose up -d`
3. Verificar health:
- Customers: http://localhost:3001/health
- Orders: http://localhost:3002/health


## Directorios
- `db/`: `schema.sql` y `seed.sql` (inicializa de MySQL)
- `customers-api/`: Express con MySQL (esqueleto)
- `orders-api/`: Express con MySQL (esqueleto)
- `lambda-orchestrator/`: Serverless Framework (Node.js 22) con `serverless-offline`


# Orchestrator + Orders confirm/cancel (E2E)

## Variables clave
- SERVICE_TOKEN (en APIs y Lambda) = `service-secret-123`
- Headers: `X-Correlation-Id` (opcional), `Idempotency-Key` (recomendado)

## Cómo levantar entorno
```bash
# Terminal A – servicios
docker compose up -d

# Terminal B – lambda
cd lambda-orchestrator
cp .env.example .env
npm install
npm run dev   # http://localhost:3000

## Requisitos
- Docker / Docker Compose
- Node 16 LTS (lambda offline)
- curl