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


## Próximos pasos
- Implementar endpoints funcionales y documentación OpenAPI por servicio.
- Añadir autenticación JWT y SERVICE_TOKEN para `/internal`.
- Añadir lógica de órdenes, transacciones e idempotencia.