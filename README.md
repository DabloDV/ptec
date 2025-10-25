# Jelou Monorepo (Customers API, Orders API, Lambda Orchestrator)

Este es un Monorepo con 3 piezas:

- **MySQL 8** para schema y seed.
- **customers-api (Node/Express)**: expone `/internal/customers/:id` (requiere token de servicio).
- **orders-api (Node/Express)**: crear/leer/confirmar/cancel con idempotencia.
- **lambda-orchestrator (Serverless Offline)**: endpoint HTTP que orquesta validar cliente, crear orden, confirmar.idempotente.


## Puertos y URL base (local)

| Servicio            | URL base                      | Salud                |
|---                  |---                             |---                   |
| MySQL               | host: `localhost:3307`        | —                    |
| customers-api       | `http://localhost:3001`       | `GET /health`        |
| orders-api          | `http://localhost:3002`       | `GET /health`        |
| Orchestrator (HTTP) | `http://localhost:3000`       | —                    |

> Nota: `serverless-offline` está en `lambdaPort: 3005` para evitar conflicto con `orders-api:3002`.


### MySQL (docker-compose)
- `MYSQL_ROOT_PASSWORD=changeme`
- `MYSQL_DATABASE=jelou`

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

### 2) Orchestrator (Serverless Offline)
```bash
cd lambda-orchestrator
npm install --no-audit --no-fund
npm run dev
```
## Endpoints principales

### customers-api
- `GET /health`
- `GET /internal/customers/:id`  
  Headers: `Authorization: Bearer service-secret-123`

### orders-api
- `GET /health`
- `POST /orders`  
  Body:
  ```json
  { "customer_id": 1, "items": [ { "product_id": 1, "qty": 1 } ] }
  ```
- `POST /orders/:id/confirm`  
  Headers: `Authorization: Bearer service-secret-123`, `Idempotency-Key: <key>`
- `POST /orders/:id/cancel`  
  Headers: `Authorization: Bearer service-secret-123`

## Directorios
- `db/`: `schema.sql` y `seed.sql` (inicializa MySQL)
- `customers-api/`: Express con MySQL 
- `orders-api/`: Express con MySQL
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
```

## Requisitos
- Docker / Docker Compose
- Node 16 LTS (lambda offline)
- curl

## Licencia
Uso interno (Prueba técnica).