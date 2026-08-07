# Commerce Mesh Lab

> **Projeto exclusivamente para fins de estudo.**  
> Laboratório pessoal de aprendizado. Não representa produto, marca ou empresa real.  
> A stack e os padrões explorados servem apenas para praticar e-commerce assíncrono, filas, idempotência e observabilidade.

## O que é

Monorepo TypeScript com:

- **React** (Vite) no frontend
- **Node.js + Fastify** em microserviços
- **AWS SQS** (LocalStack localmente) para filas
- **PostgreSQL** (Supabase ou Postgres local) com foco em **idempotência**
- **Datadog** (`dd-trace`) para observabilidade

## Ecossistema

| App / Pacote | Função |
|---|---|
| `apps/orders-api` | API REST — cria/lista pedidos com `Idempotency-Key` |
| `apps/order-worker` | Consumer SQS — processa pedidos de forma at-least-once |
| `apps/web` | UI para criar pedidos e acompanhar status |
| `packages/shared` | Tipos, logger, client SQS e bootstrap de tracing |
| `db/migrations` | Schema SQL versionado |

## Conceitos que este lab cobre

- Idempotência em APIs e workers
- Filas SQS (visibility timeout, delete, DLQ)
- Entrega at-least-once e processamento exatamente-uma-vez no domínio
- Microserviços desacoplados por mensagens
- Observabilidade com APM
- Otimização de consultas e índices no Postgres

## Pré-requisitos

- Node.js 20+
- Docker (LocalStack)
- Conta Supabase (ou Postgres local) com `DATABASE_URL`

## Quick start

```bash
cp .env.example .env
# preencha DATABASE_URL com a connection string do Supabase

npm install
npm run infra:up          # LocalStack + filas SQS
# aplique db/migrations/001_init.sql no Supabase (SQL Editor)

npm run dev               # orders-api
npm run worker            # order-worker (outro terminal)
npm run web               # frontend (outro terminal)
```

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Conceitos (idempotência, filas, otimização)](docs/CONCEPTS.md)

## Testes

```bash
npm test
```

## Licença

MIT — uso educacional.
