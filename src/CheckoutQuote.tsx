import { Button } from "./components/ui/button";
import { orderAttemptKey, orderRequestTimeoutMs, type Order } from "./order";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import axios from "axios";
import { cartQueryKey, type CartResponse } from "./cart-query";

import { useRef } from "react";
import type { WalletSelection } from "./wallet";

export function CheckoutQuote({ cart, selection, note }: { cart: CartResponse; selection: WalletSelection; note: string }) {
  const submitting = useRef(false);
  const attemptNote = useRef<string | undefined>(undefined);
  const order = useMutation({
    mutationFn: async (reviewedQuote: string) => {
      const submittedNote = attemptNote.current ?? "";
      const attempt = orderAttemptKey(selection, reviewedQuote, submittedNote);
      const key = sessionStorage.getItem(attempt) ?? crypto.randomUUID();
      sessionStorage.setItem(attempt, key);
      const { data } = await axios.post<Order>(
        "/api/orders",
        { ...selection, reviewedQuote, note: submittedNote },
        { headers: { "Idempotency-Key": key }, timeout: orderRequestTimeoutMs },
      );
      return data;
    },
    retry: false,
  });
  const orderError = axios.isAxiosError<{ message?: string }>(order.error) ? order.error : undefined;
  const queryClient = useQueryClient();
  const quote = useMutation({
    mutationFn: async (reviewedCart: CartResponse) => {
      const { data } = await axios.post<CartResponse>("/api/checkout/quote");
      queryClient.setQueryData(cartQueryKey, data);
      const snapshot = JSON.stringify(data);
      return { changed: JSON.stringify(reviewedCart) !== snapshot, snapshot };
    },
  });
  const error = axios.isAxiosError<{ message?: string }>(quote.error) ? quote.error : undefined;

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        disabled={quote.isPending || order.isPending || order.isSuccess}
        className="justify-self-start"
        onClick={() => {
          if (quote.data?.snapshot !== JSON.stringify(cart)) attemptNote.current = undefined;
          order.reset();
          quote.mutate(cart);
        }}
      >
        {quote.isPending ? "Verificando..." : "Verificar cotação"}
      </Button>
      {quote.data && (
        <p role="status">
          {quote.data.changed
            ? "A cotação mudou. Revise os valores atualizados e verifique novamente."
            : "Cotação conferida."}
        </p>
      )}
      {quote.isError && (
        <p role="alert">{error?.response?.data?.message ?? "Não foi possível verificar a cotação."}</p>
      )}
      {quote.data && !quote.data.changed && quote.data.snapshot === JSON.stringify(cart) && !order.isSuccess && (
        <Button
          type="button"
          className="justify-self-start"
          disabled={order.isPending || orderError?.response?.status === 409 || orderError?.response?.status === 401}
          onClick={() => {
            if (submitting.current) return;
            submitting.current = true;
            attemptNote.current ??= note.trim();
            order.mutate(quote.data.snapshot, {
              onSettled: () => { submitting.current = false; },
            });
          }}
        >
          {order.isPending ? "Enviando..." : order.isError ? "Tentar envio novamente" : "Confirmar compra"}
        </Button>
      )}
      {order.data && <p role="status">Pedido registrado. <Link to="/orders/$id" params={{ id: order.data.id }} className="underline">Acompanhar pedido</Link></p>}
      {order.isError && (
        <p role="alert">{orderError?.response?.data?.message ?? (orderError?.code === "ECONNABORTED" || orderError?.code === "ETIMEDOUT"
            ? "A resposta demorou. Tente o envio novamente para recuperar o pedido."
            : "Sem resposta do pedido. Tente o envio novamente.")}</p>
      )}
      {(error?.response?.status === 401 || orderError?.response?.status === 401) && <Link to="/login" className="underline">Entrar novamente</Link>}
    </div>
  );
}
