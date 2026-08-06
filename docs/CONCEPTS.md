# Conceitos — Commerce Mesh Lab

Material de estudo. Sem vínculo com empresas reais.

## Idempotência

Uma operação idempotente pode ser repetida sem efeitos colaterais extras.

Neste lab:

1. O cliente envia o header `Idempotency-Key` (UUID recomendado).
2. A API calcula um hash do payload e grava em `idempotency_keys`.
3. Se a mesma chave voltar com o **mesmo** payload → devolve a resposta original (`replayed: true`).
4. Se a mesma chave voltar com payload **diferente** → `409 Conflict`.

Isso evita pedidos duplicados em retries de rede, double-click e timeouts.

## Filas SQS e at-least-once

SQS garante entrega **pelo menos uma vez**. O worker pode receber a mesma mensagem mais de uma vez.

Efeito exatamente-uma-vez no domínio:

- Claim otimista: `UPDATE ... WHERE status = 'PENDING'`
- Se outra entrega já processou, o worker faz `skip` e deleta a mensagem

## Visibility timeout e DLQ

- Enquanto o worker processa, a mensagem fica invisível.
- Se o worker falhar sem deletar, a mensagem reaparece.
- Após `maxReceiveCount` (3), vai para a DLQ (`commerce-mesh-orders-dlq`).

## Otimizações aplicadas

- Índices em `orders(status)` e `orders(created_at DESC)`
- Índice parcial na outbox para eventos não publicados
- Pool de conexões Postgres (`pg.Pool`)
- Long polling SQS (`WaitTimeSeconds`) para reduzir empty receives

## Observabilidade

Com `DD_TRACE_ENABLED=true` e agent Datadog local/remoto, `dd-trace` instrumenta a API e o worker. Localmente o default é desligado (no-op).

## Fluxo ponta a ponta

```
Web → POST /orders (+ Idempotency-Key)
    → Postgres (order PENDING + idempotency_keys)
    → SQS commerce-mesh-orders
    → order-worker (PROCESSING → CONFIRMED|FAILED)
    → Web faz polling GET /orders
```
