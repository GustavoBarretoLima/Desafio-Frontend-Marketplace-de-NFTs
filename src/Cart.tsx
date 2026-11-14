import { Skeleton } from "./components/ui/skeleton";
import { Button } from "./components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { Link } from "@tanstack/react-router";
import { cartQueryKey, cartQueryOptions, type CartResponse } from "./cart-query";
import { CartTotals } from "./CartTotals";
import { formatEth, toWei } from "./eth";
import { MarketGuide } from "./HomeJournal";
import { MarketFooter } from "./MarketFooter";
import { RelatedNfts } from "./RelatedNfts";

const catalogSearch = { q: "", sort: undefined, availability: undefined, page: undefined };

type CartAction =
  | { kind: "quantity"; item: CartResponse["items"][number]; quantity: number }
  | { kind: "remove"; item: CartResponse["items"][number] };

export function Cart() {
  const queryClient = useQueryClient();
  const updateCoupon = useMutation({
    mutationFn: async (code: string | null) => {
      if (code === null) {
        await axios.delete("/api/cart/coupon");
      } else {
        await axios.put("/api/cart/coupon", { code });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartQueryKey }),
  });
  const couponError = axios.isAxiosError<{ message?: string }>(updateCoupon.error)
    ? updateCoupon.error.response?.data?.message
    : undefined;
  const updateCart = useMutation({
    mutationFn: async (action: CartAction) => {
      const { nftId, editionId } = action.item;
      const url = `/api/cart/items/${encodeURIComponent(nftId)}/${encodeURIComponent(editionId)}`;

      if (action.kind === "quantity") {
        await axios.patch(url, { quantity: action.quantity });
      } else {
        await axios.delete(url);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartQueryKey }),
  });
  const mutationError = axios.isAxiosError<{ message?: string }>(updateCart.error)
    ? updateCart.error.response?.data?.message
    : undefined;
  const { data, isPending, isError, refetch } = useQuery(cartQueryOptions);

  return (
    <div className="market-cart">
      <nav aria-label="Localização" className="cart-breadcrumb">
        <Link to="/" search={catalogSearch}>Início</Link>
        <span aria-hidden="true"> / </span>
        <Link to="/" search={catalogSearch} hash="catalogo">Mercado</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Carrinho</span>
      </nav>
      <h1 className="sr-only">Carrinho de NFTs</h1>
      {isPending && (
        <div role="status" className="grid gap-6">
          <span className="sr-only">Carregando carrinho...</span>
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="grid gap-2 rounded-xl border border-white/10 p-4">
            <Skeleton className="mb-2 h-7 w-44" />
            <Skeleton className="mb-2 h-10 w-full max-w-xs" />
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="flex justify-between gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
            <Skeleton className="mt-2 h-10 w-36" />
          </div>
        </div>
      )}
      {isError && (
        <>
          <p role="alert">Não foi possível carregar o carrinho.</p>
          <button type="button" className="underline" onClick={() => void refetch()}>
            Tentar novamente
          </button>
        </>
      )}
      {updateCart.isPending && <p role="status">Atualizando carrinho...</p>}
      {updateCart.isError && (
        <p role="alert">{mutationError ?? "Não foi possível atualizar o carrinho."}</p>
      )}
      {updateCart.isSuccess && (
        <p role="status">
          {updateCart.variables.kind === "remove" ? "Item removido." : "Quantidade atualizada."}
        </p>
      )}
      {data?.items.length === 0 && <p>Seu carrinho está vazio.</p>}
      <div className="cart-layout">
        {data && data.items.length > 0 && (
          <table className="cart-items">
            <caption className="sr-only">Itens do carrinho</caption>
            <thead>
              <tr>
                <th scope="col">NFTs</th>
                <th scope="col">Preço</th>
                <th scope="col">Edições</th>
                <th scope="col">Total</th>
                <th scope="col"><span className="sr-only">Remover</span></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={JSON.stringify([item.nftId, item.editionId])}>
                  <td className="cart-item-art">
                    <Link className="cart-item-info" to="/nfts/$id" params={{ id: item.nftId }}>
                      <img className="cart-item-image" src={item.imageUrl} alt="" width={72} height={72} />
                      <span><strong>{item.name}</strong><small>Edição {item.editionName}</small></span>
                    </Link>
                  </td>
                  <td className="cart-item-price">{item.priceEth} ETH</td>
                  <td className="cart-item-quantity">
                    <div className="cart-item-controls">
                      <button
                        type="button"
                        aria-label={"Diminuir quantidade de " + item.name + ", edição " + item.editionName}
                        disabled={updateCart.isPending || item.quantity <= 1 || item.quantity - 1 > item.stock}
                        onClick={() => updateCart.mutate({ kind: "quantity", item, quantity: item.quantity - 1 })}
                      >
                        &minus;
                      </button>
                      <span><span className="sr-only">Quantidade </span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={"Aumentar quantidade de " + item.name + ", edição " + item.editionName}
                        disabled={updateCart.isPending || item.quantity >= item.stock}
                        onClick={() => updateCart.mutate({ kind: "quantity", item, quantity: item.quantity + 1 })}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="cart-item-total">{formatEth(toWei(item.priceEth) * BigInt(item.quantity))} ETH</td>
                  <td className="cart-item-action">
                    <button
                      type="button"
                      aria-label={"Remover " + item.name + ", edição " + item.editionName}
                      disabled={updateCart.isPending}
                      onClick={() => updateCart.mutate({ kind: "remove", item })}
                    >
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && (data.items.length > 0 || data.coupon) && (
          <section aria-labelledby="cart-summary" className="cart-summary">
            <h2 id="cart-summary" className="cart-summary-title">Resumo da carteira</h2>
            {data.coupon ? (
              <div className="flex flex-wrap gap-3">
                <p role="status">Cupom {data.coupon} aplicado</p>
                <button type="button" className="underline" disabled={updateCoupon.isPending} onClick={() => updateCoupon.mutate(null)}>
                  Remover cupom
                </button>
              </div>
            ) : (
              <form
                className="cart-coupon"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (updateCoupon.isPending) return;
                  const code = String(new FormData(event.currentTarget).get("code") ?? "");
                  updateCoupon.mutate(code);
                }}
              >
                <label htmlFor="cart-coupon">Código promocional</label>
                <input id="cart-coupon" name="code" required placeholder="Digite o código promocional..." />
                <button type="submit" disabled={updateCoupon.isPending}>Aplicar</button>
              </form>
            )}
            {updateCoupon.isPending && <p role="status">Atualizando cupom...</p>}
            {updateCoupon.isError && (
              <p role="alert">{couponError ?? "Não foi possível atualizar o cupom."}</p>
            )}
            <CartTotals summary={data.summary} variant="cart" />
            {data.items.length > 0 && !isError && !updateCart.isPending && !updateCoupon.isPending && (
              <Button asChild className="cart-checkout">
                <Link to="/checkout">Conectar e finalizar</Link>
              </Button>
            )}
            <Link to="/" search={catalogSearch} hash="catalogo" className="cart-continue">Continuar explorando</Link>
          </section>
        )}
      </div>
      {data?.items.length === 0 && !data.coupon && (
        <Link to="/" search={catalogSearch} hash="catalogo" className="cart-continue">Continuar explorando</Link>
      )}
      <RelatedNfts title="Colecionadores também viram" />
      <MarketGuide />
      <MarketFooter product />
    </div>
  );
}
