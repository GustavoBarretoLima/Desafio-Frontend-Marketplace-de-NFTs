import type { CartResponse } from "./cart-query";

export function CartTotals({ summary, variant }: { summary: CartResponse["summary"]; variant?: "cart" }) {
  return (
    <dl className={["mt-4 grid grid-cols-[1fr_auto] gap-2", variant === "cart" && "cart-totals"].filter(Boolean).join(" ")}>
      <dt>Subtotal</dt>
      <dd>{summary.subtotalEth} ETH</dd>
      <dt>{variant === "cart" ? "Desconto do lançamento" : "Desconto"}</dt>
      <dd>{variant === "cart" && summary.discountEth !== "0" && "−"}{summary.discountEth} ETH</dd>
      <dt>Taxa de rede</dt>
      <dd>{summary.networkFeeEth} ETH{variant === "cart" && <small>Taxa estimada</small>}</dd>
      <dt className="font-semibold">Total</dt>
      <dd className="font-semibold text-amber-300">{summary.totalEth} ETH</dd>
    </dl>
  );
}
