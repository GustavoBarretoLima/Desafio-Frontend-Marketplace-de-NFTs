import { useEffect } from "react";
import { io } from "socket.io-client";
import { useSession } from "./AccountMenu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import axios from "axios";
import { cartQueryKey } from "./cart-query";
import { OrderReceipt } from "./OrderReceipt";
import { orderAttemptKey, type Order } from "./order";

export function OrderPage() {
  const { id } = getRouteApi("/orders/$id").useParams();
  const url = `/api/orders/${encodeURIComponent(id)}`;
  const queryKey = ["order", id] as const;
  const client = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user.id;
  const expiresAt = session?.expiresAt;

  useEffect(() => {
    if (!userId || !expiresAt || expiresAt <= Date.now()) return;
    const socket = io({ transports: ["websocket"], autoConnect: false, path: "/kurio-realtime" });
    const reconcile = () => {
      void client.invalidateQueries({ queryKey: ["order", id], exact: true });
      void client.invalidateQueries({ queryKey: cartQueryKey });
    };
    socket.on("connect", reconcile);
    let version = 0;
    socket.on("order.updated", (event: { orderId: string; version: number }) => {
      if (event.orderId !== id || event.version <= version) return;
      version = event.version;
      reconcile();
    });
    socket.connect();
    const expiration = window.setTimeout(() => {
      socket.disconnect();
      reconcile();
    }, expiresAt - Date.now());
    return () => {
      window.clearTimeout(expiration);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [client, id, userId, expiresAt]);
  const order = useQuery({
    queryKey,
    queryFn: async ({ signal }) => (await axios.get<Order>(url, { signal })).data,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const payment = useMutation({
    mutationFn: async (approved: boolean) =>
      (await axios.post<Order>(`${url}/payment`, { approved })).data,
    onSuccess: async (data) => {
      await client.cancelQueries({ queryKey });
      client.setQueryData(queryKey, data);
      sessionStorage.removeItem(orderAttemptKey(data, JSON.stringify(data.quote), data.note));
      await client.invalidateQueries({ queryKey: cartQueryKey });
    },
  });
  const error = payment.error ?? order.error;
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const data = order.data;

  if (data?.status === "confirmed" && !order.isError && status !== 401) {
    return <OrderReceipt order={data} />;
  }

  return (
    <section className="order-page">
      <Link to="/cart" className="nft-detail-back justify-self-start">
        <span aria-hidden="true">‹</span> Voltar ao carrinho
      </Link>
      <h1 className="cart-title">Acompanhar pedido</h1>
      {order.isPending && <p role="status">Carregando pedido...</p>}
      {status === 401 && (
        <Link to="/login" search={{ orderId: id }} className="justify-self-start underline">Entrar para consultar o pedido</Link>
      )}
      {error && status !== 401 && (
        <div>
          <p role="alert">{status === 404 ? "Pedido não encontrado." : "Não foi possível consultar ou atualizar o pedido."}</p>
          <button type="button" className="underline" onClick={() => { payment.reset(); void order.refetch(); }}>
            Consultar novamente
          </button>
        </div>
      )}
      {data && !order.isFetching && !order.isError && status !== 401 && (
        <div className="order-panel" data-status={data.status}>
          <p className="order-reference">Pedido {data.id}</p>
          {data.note && <p className="break-words">Observação do colecionador: {data.note}</p>}
          {data.status === "pending" && (
            <>
              <p role="status">{payment.isPending ? "Registrando resultado..." : "Pagamento pendente"}</p>
              <div className="order-actions">
                <button type="button" disabled={payment.isPending} onClick={() => payment.mutate(true)}>
                  Simular aprovação
                </button>
                <button type="button" disabled={payment.isPending} onClick={() => payment.mutate(false)}>
                  Simular recusa
                </button>
              </div>
            </>
          )}
          {data.status === "declined" && <p role="status">Pagamento recusado. Os itens continuam no carrinho.</p>}
        </div>
      )}
    </section>
  );
}
