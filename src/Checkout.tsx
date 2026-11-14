import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckoutCollector } from "./CheckoutCollector";
import { CheckoutQuote } from "./CheckoutQuote";
import { CheckoutWallet } from "./CheckoutWallet";
import { cartQueryOptions } from "./cart-query";
import { CartTotals } from "./CartTotals";
import { formatEth, toWei } from "./eth";
import { MarketGuide } from "./HomeJournal";
import { MarketFooter } from "./MarketFooter";
import type { WalletOption } from "./wallet";

const homeSearch = { q: "", sort: undefined, availability: undefined, page: undefined };

export function Checkout() {
  const { data, isPending, isError, refetch } = useQuery(cartQueryOptions);
  const [wallet, setWallet] = useState<WalletOption>();
  const [network, setNetwork] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="market-checkout">
      <nav aria-label="Localização" className="cart-breadcrumb">
        <Link to="/" search={homeSearch}>Início</Link> / <Link to="/" search={homeSearch} hash="catalogo">Mercado</Link> / <span aria-current="page">Pagamento</span>
      </nav>
      <h1 className="sr-only">Pagamento</h1>
      {isPending && <p role="status">Carregando pedido...</p>}
      {isError && (
        <>
          <p role="alert">Não foi possível carregar os itens e valores do pedido.</p>
          <button type="button" className="underline" onClick={() => void refetch()}>Tentar novamente</button>
        </>
      )}
      {!isError && data?.items.length === 0 && <p>Seu carrinho está vazio. <Link to="/cart" className="underline">Voltar ao carrinho</Link></p>}

      {!isError && data && data.items.length > 0 && (
        <div className="checkout-layout">
          <CheckoutCollector wallet={wallet} network={network} note={note} setNote={setNote} />
          <div className="checkout-order">
            <section aria-labelledby="checkout-items">
              <h2 id="checkout-items">Seus NFTs</h2>
              <div className="checkout-item-head" aria-hidden="true"><span>NFTs</span><span>Subtotal</span></div>
              <ul className="checkout-items">
                {data.items.map((item) => (
                  <li key={JSON.stringify([item.nftId, item.editionId])} className="checkout-item">
                    <img src={item.imageUrl} alt="" width={64} height={64} />
                    <div className="min-w-0 break-words">
                      <h3>{item.name}</h3>
                      <p>{/#[0-9]+$/.test(item.name) ? "ID do token: " + item.name.replace(/^.*#(\d+)$/, (_, id: string) => "#" + id.padStart(4, "0")) : "Edição " + item.editionName}</p>
                      {item.quantity > item.stock && <p role="alert">A quantidade excede o estoque. Ajuste no carrinho.</p>}
                    </div>
                    <span className="checkout-item-quantity">(× {item.quantity})</span>
                    <strong>{formatEth(toWei(item.priceEth) * BigInt(item.quantity))} ETH</strong>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-label="Resumo do pedido">
              <Link to="/cart" className="checkout-promo">
                {data.coupon ? "Cupom " + data.coupon + " aplicado. Editar cupom" : "Tem um código promocional? Aplique aqui"}
              </Link>
              <CartTotals summary={data.summary} variant="cart" />
            </section>
            <CheckoutWallet onSelectionChange={(option, selectedNetwork) => {
              setWallet(option);
              setNetwork(selectedNetwork);
            }}>
              {(selection) => <CheckoutQuote cart={data} selection={selection} note={note} />}
            </CheckoutWallet>
          </div>
        </div>
      )}
      <MarketGuide />
      <MarketFooter product />
    </div>
  );
}
