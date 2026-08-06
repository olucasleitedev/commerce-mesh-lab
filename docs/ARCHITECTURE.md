# Arquitetura — Commerce Mesh Lab

## Visão geral

Monorepo npm workspaces com três apps e um pacote compartilhado:

| Pacote | Responsabilidade |
|---|---|
| `apps/web` | UI React (Vite) |
| `apps/orders-api` | API REST + idempotência + publish SQS |
| `apps/order-worker` | Consumer SQS + transição de status |
| `packages/shared` | Tipos, logger, SQS client, tracing |

## Diagrama

```
┌─────────┐   REST + Idempotency-Key   ┌─────────────┐
│   web   │ ─────────────────────────▶ │ orders-api  │
└─────────┘                            └──────┬──────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                   ┌──────────┐         ┌──────────┐         ┌─────────┐
                   │ Postgres │         │   SQS    │         │ Datadog │
                   │ Supabase │         │LocalStack│         │(opcional│
                   └────▲─────┘         └────┬─────┘         └─────────┘
                        │                    │
                        │              ┌─────▼──────┐
                        └──────────────│order-worker│
                                       └────────────┘
```

## Contratos principais

### `POST /orders`

Headers:

- `Idempotency-Key` (obrigatório)

Body:

```json
{
  "customerName": "Ana Silva",
  "productSku": "SKU-FLORA-01",
  "quantity": 2,
  "amountCents": 4990
}
```

### Mensagem SQS

```json
{
  "orderId": "uuid",
  "idempotencyKey": "uuid",
  "enqueuedAt": "ISO-8601"
}
```

## Infra local

- `docker compose up -d` sobe LocalStack e cria filas via `scripts/localstack-init.sh`
- Schema em `db/migrations/001_init.sql` (aplicar no Supabase)

Veja também [CONCEPTS.md](./CONCEPTS.md).
