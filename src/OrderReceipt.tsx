import { Link } from "@tanstack/react-router";
import { formatEth, toWei } from "./eth";
import type { Order } from "./order";

export function OrderReceipt({ order }: { order: Order }) {
  const { summary, items } = order.quote;
  const date = order.confirmedAt && new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(order.confirmedAt));
  const explorer = order.networkId === "ethereum" ? "https://etherscan.io" :
    order.networkId === "sepolia" ? "https://sepolia.etherscan.io" : undefined;
  const transaction = order.transactionId;
  const explorerUrl = explorer && transaction && /^0x[0-9a-f]{64}$/i.test(transaction)
    ? explorer + "/tx/" + transaction : undefined;

  return (
    <section aria-label="Recibo do pedido" className="order-receipt">
      <header className="receipt-header">
        <Link to="/cart" aria-label="Fechar recibo e voltar ao carrinho" className="receipt-close">×</Link>
        <svg aria-hidden="true" viewBox="0 0 80 88" width="80" height="88" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
          <path d="m31 12 5-5a6 6 0 0 1 8 0l5 5M12 42l-6 7v34a2 2 0 0 0 2 2h64a2 2 0 0 0 2-2V49l-6-7M12 58V15a3 3 0 0 1 3-3h50a3 3 0 0 1 3 3v43M6 49l22 23m46-23L52 72M6 83l29-29a7 7 0 0 1 10 0l29 29" />
          <text x="40" y="32" textAnchor="middle" fill="currentColor" stroke="none" fontSize="13" fontWeight="bold">THANK</text>
          <text x="40" y="46" textAnchor="middle" fill="currentColor" stroke="none" fontSize="13" fontWeight="bold">YOU</text>
        </svg>
        <h1>Seus NFTs agora estão na sua carteira</h1>
        <p role="status" className="sr-only">Pagamento confirmado</p>
      </header>
      <dl className="receipt-meta">
        <div><dt>ID da transação</dt><dd title={transaction}>{transaction ? transaction.slice(0, 10) + "…" + transaction.slice(-4) : "—"}<span className="sr-only"> {transaction}</span></dd></div>
        <div><dt>Data</dt><dd>{date || "—"}</dd></div>
        <div><dt>Total</dt><dd>{summary.totalEth} ETH</dd></div>
        <div><dt>Carteira</dt><dd>{order.walletName ?? (order.walletId === "principal" ? "Principal" : order.walletId === "reserva" ? "Reserva" : order.walletId)}</dd></div>
      </dl>
      <div className="receipt-body">
        <h2>Detalhes da transação</h2>
        <table>
          <thead><tr><th scope="col">NFTs</th><th scope="col">Edições</th><th scope="col">Subtotal</th></tr></thead>
          <tbody>
            {items.map((item) => {
              const token = item.name.match(/#(\d+)$/)?.[1];
              return (
                <tr key={JSON.stringify([item.nftId, item.editionId])}>
                  <td><div className="receipt-nft">
                    <img src={item.imageUrl} alt="" width={68} height={68} />
                    <span><strong>{item.name}</strong><small>{token ? "ID do token: #" + token.padStart(4, "0") : item.editionName}</small></span>
                  </div></td>
                  <td>(× {item.quantity})</td>
                  <td>{formatEth(toWei(item.priceEth) * BigInt(item.quantity))} ETH</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <dl className="receipt-totals">
          <dt>Taxa de rede</dt><dd>{summary.networkFeeEth} ETH</dd>
          <dt>Total</dt><dd>{summary.totalEth} ETH</dd>
        </dl>
        {order.note && <p className="receipt-note">Observação do colecionador: {order.note}</p>}
        <p id="receipt-message" className="receipt-message">{explorerUrl ? "Transação confirmada na rede." : "Pagamento simulado confirmado. O ID deste recibo está disponível apenas na demonstração."}</p>
        {explorerUrl ? <a className="receipt-action" href={explorerUrl} target="_blank" rel="noopener noreferrer">Ver no Etherscan</a> :
          <button type="button" className="receipt-action" disabled aria-describedby="receipt-message">Ver no Etherscan</button>}
      </div>
    </section>
  );
}
