import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createOrder, listOrders, newIdempotencyKey } from "./api";
import type { CreateOrderPayload, Order } from "./types";

const defaultForm: CreateOrderPayload = {
  customerName: "Ana Silva",
  productSku: "SKU-MESH-01",
  quantity: 2,
  amountCents: 4990,
};

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function GradientMesh() {
  return (
    <div className="mesh" aria-hidden="true">
      <svg viewBox="0 0 1440 520" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="48" />
          </filter>
          <linearGradient id="wash" x1="0%" y1="0%" x2="100%" y2="40%">
            <stop offset="0%" stopColor="#f5e9d4" />
            <stop offset="22%" stopColor="#f6c9a0" />
            <stop offset="48%" stopColor="#c7b6f7" />
            <stop offset="72%" stopColor="#533afd" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ea2261" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        <rect width="1440" height="520" fill="url(#wash)" opacity="0.55" />
        <g filter="url(#blur)">
          <ellipse cx="180" cy="180" rx="280" ry="180" fill="#f5e9d4" />
          <ellipse cx="420" cy="240" rx="220" ry="160" fill="#f6c9a0" />
          <ellipse cx="700" cy="160" rx="260" ry="190" fill="#c7b6f7" />
          <ellipse cx="980" cy="220" rx="240" ry="170" fill="#533afd" />
          <ellipse cx="1240" cy="170" rx="220" ry="160" fill="#ea2261" />
          <ellipse cx="1100" cy="300" rx="180" ry="120" fill="#f96bee" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
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
      <GradientMesh />

      <div className="shell">
        <nav className="nav">
          <span className="nav-brand">Commerce Mesh Lab</span>
          <span className="nav-meta">Estudo · orders + SQS</span>
        </nav>

        <header className="hero">
          <span className="eyebrow">Financial infrastructure lab</span>
          <h1>Commerce Mesh Lab</h1>
          <p>
            Idempotência, filas SQS e processamento assíncrono. Reenvie com a
            mesma chave para ver o replay.
          </p>
        </header>

        <div className="layout">
          <section className="panel">
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

          <section className="panel">
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
                      <td className="amount">{order.quantity}</td>
                      <td className="amount">{formatMoney(order.amountCents)}</td>
                      <td className="mono">{order.id.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
