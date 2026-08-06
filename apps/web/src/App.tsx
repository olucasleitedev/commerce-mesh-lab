import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createOrder, listOrders, newIdempotencyKey } from "./api";
import type { CreateOrderPayload, Order } from "./types";

const defaultForm: CreateOrderPayload = {
  customerName: "Ana Silva",
  productSku: "SKU-FLORA-01",
  quantity: 2,
  amountCents: 4990,
};

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function App() {
  const [form, setForm] = useState<CreateOrderPayload>(defaultForm);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listOrders();
      setOrders(data);
    } catch (error) {
      setMessage({
        type: "err",
        text: error instanceof Error ? error.message : "Falha ao listar pedidos",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await createOrder(form, idempotencyKey);
      setMessage({
        type: "ok",
        text: result.replayed
          ? `Replay idempotente — mesmo pedido ${result.order.id}`
          : `Pedido criado: ${result.order.id}`,
      });
      await refresh();
    } catch (error) {
      setMessage({
        type: "err",
        text: error instanceof Error ? error.message : "Erro ao criar pedido",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header>
        <span className="badge">Estudo · Commerce Mesh Lab</span>
        <h1>Commerce Mesh Lab</h1>
        <p>
          Laboratório para praticar idempotência, filas SQS e processamento
          assíncrono. Reenvie o formulário com a mesma chave para ver o replay.
        </p>
      </header>

      <div className="layout">
        <section>
          <h2>Novo pedido</h2>
          <form onSubmit={onSubmit}>
            <label>
              Cliente
              <input
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                required
              />
            </label>
            <label>
              SKU
              <input
                value={form.productSku}
                onChange={(e) => setForm((f) => ({ ...f, productSku: e.target.value }))}
                required
              />
            </label>
            <label>
              Quantidade
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: Number(e.target.value) }))
                }
                required
              />
            </label>
            <label>
              Valor (centavos)
              <input
                type="number"
                min={0}
                value={form.amountCents}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amountCents: Number(e.target.value) }))
                }
                required
              />
            </label>

            <p className="hint">
              Idempotency-Key: <span className="mono">{idempotencyKey}</span>
            </p>

            <div className="actions">
              <button type="submit" disabled={loading}>
                {loading ? "Enviando…" : "Criar pedido"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setIdempotencyKey(newIdempotencyKey())}
              >
                Nova chave
              </button>
            </div>
          </form>
          {message ? <p className={`message ${message.type}`}>{message.text}</p> : null}
        </section>

        <section>
          <div className="toolbar">
            <h2>Pedidos</h2>
            <button type="button" className="secondary" onClick={() => void refresh()}>
              Atualizar
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="empty">Nenhum pedido ainda.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Cliente</th>
                  <th>SKU</th>
                  <th>Qtd</th>
                  <th>Valor</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className={`status ${order.status}`}>{order.status}</span>
                    </td>
                    <td>{order.customerName}</td>
                    <td className="mono">{order.productSku}</td>
                    <td>{order.quantity}</td>
                    <td>{formatMoney(order.amountCents)}</td>
                    <td className="mono">{order.id.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
