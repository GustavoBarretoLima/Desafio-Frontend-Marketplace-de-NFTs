import type { CartResponse } from "./cart-query";
import type { WalletSelection } from "./wallet";

export type Order = WalletSelection & {
  id: string;
  status: "pending" | "confirmed" | "declined";
  quote: CartResponse;
  transactionId?: string;
  confirmedAt?: string;
  walletName?: string;
  note?: string;
};

export function orderAttemptKey(selection: WalletSelection, reviewedQuote: string, note = "") {
  return `kurio:order-attempt:${JSON.stringify([selection.walletId, selection.networkId, reviewedQuote, ...(note.trim() ? [note.trim()] : [])])}`;
}

export const orderRequestTimeoutMs = 8000;
