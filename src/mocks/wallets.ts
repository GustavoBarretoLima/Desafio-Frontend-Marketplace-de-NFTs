import { http, HttpResponse } from "msw";
import type { WalletOption } from "../wallet";
import { getDemoSession, sessionRequired } from "./session";

const ethereum = { id: "ethereum", name: "Ethereum" };
const sepolia = { id: "sepolia", name: "Sepolia" };
const walletSlots: WalletOption[] = [
  { id: "principal", name: "Principal", address: "0xa91f00000000000000000000000000000000e82c", networks: [ethereum, sepolia] },
  { id: "reserva", name: "Reserva", address: "0xbc0200000000000000000000000000000000705d", networks: [sepolia] },
];

function walletKey(userId: string) {
  return `kurio:wallets:${userId}`;
}

export function readWallets(userId: string) {
  const stored: Record<string, string | Pick<WalletOption, "address" | "details">> = JSON.parse(localStorage.getItem(walletKey(userId)) ?? "{}");
  return walletSlots.map((slot) => {
    const value = stored[slot.id];
    return {
      ...slot,
      address: typeof value === "string" ? value : value?.address ?? (userId === "demo-collector" ? slot.address : ""),
      details: typeof value === "object" ? value.details : userId === "demo-collector" && value === undefined
        ? { type: slot.id === "principal" ? "MetaMask" : "Coinbase Wallet" }
        : undefined,
    };
  });
}

export const walletHandlers = [
  http.get("/api/wallets", () => {
    const session = getDemoSession();
    return session
      ? HttpResponse.json({ wallets: readWallets(session.user.id) })
      : sessionRequired();
  }),
  http.put("/api/wallets/:id", async ({ params, request }) => {
    const body: unknown = await request.json().catch(() => null);
    const session = getDemoSession();
    if (!session) return sessionRequired();

    const slot = walletSlots.find((option) => option.id === params.id);
    if (!slot) return HttpResponse.json({ message: "Carteira não encontrada." }, { status: 404 });
    const address = body && typeof body === "object" && "address" in body && typeof body.address === "string"
      ? body.address.trim() : "";
    if (!/^0x[a-f0-9]{40}$/i.test(address)) {
      return HttpResponse.json({ message: "Informe um endereço 0x seguido de 40 caracteres hexadecimais." }, { status: 400 });
    }

    const wallets = readWallets(session.user.id);
    if (wallets.some((wallet) => wallet.id !== slot.id && wallet.address.toLowerCase() === address.toLowerCase())) {
      return HttpResponse.json({ message: "Este endereço já está cadastrado em outra carteira." }, { status: 409 });
    }
    const current = wallets.find((wallet) => wallet.id === slot.id);
    const details = { ...current?.details };
    if (body && typeof body === "object") {
      for (const field of ["displayName", "nickname", "network", "profileName", "secondary", "type", "referral", "email", "ens"]) {
        const value = (body as Record<string, unknown>)[field];
        if (typeof value === "string") details[field] = value.trim().slice(0, 120);
      }
    }
    const updated = { ...slot, address, details };
    localStorage.setItem(walletKey(session.user.id), JSON.stringify(
      Object.fromEntries(wallets.map((wallet) => {
        const entry = wallet.id === slot.id ? updated : wallet;
        return [entry.id, { address: entry.address, details: entry.details }];
      })),
    ));
    return HttpResponse.json(updated);
  }),
  http.post("/api/wallet-connection", async ({ request }) => {
    const body: unknown = await request.json().catch(() => null);
    const session = getDemoSession();
    if (!session) return sessionRequired();

    if (
      !body || typeof body !== "object" ||
      !("walletId" in body) || !("networkId" in body) ||
      !("approved" in body) || typeof body.approved !== "boolean"
    ) {
      return HttpResponse.json({ message: "Selecione a carteira e a rede." }, { status: 400 });
    }

    const wallet = readWallets(session.user.id).find((option) => option.id === body.walletId && option.address);
    const network = wallet?.networks.find((option) => option.id === body.networkId);
    if (!wallet || !network) {
      return HttpResponse.json({ message: "Rede indisponível para esta carteira." }, { status: 422 });
    }
    if (!body.approved) {
      return HttpResponse.json({ message: "Conexão recusada." }, { status: 409 });
    }

    return HttpResponse.json({ walletId: wallet.id, networkId: network.id });
  }),
];
