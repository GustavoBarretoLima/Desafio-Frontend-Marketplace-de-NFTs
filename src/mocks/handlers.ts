import { formatEth, toWei } from "../eth";
import { catalogUpdateKey, publishOrderUpdate } from "./order-socket";
import { orderRequestTimeoutMs, type Order } from "../order";
import { readWallets, walletHandlers } from "./wallets";
import { getDemoSession, createSessionHandlers, sessionRequired } from "./session";
import { delay, http, HttpResponse } from "msw";

const nfts = [
  {
    id: "emerald-ape-042",
    network: "Ethereum",
    collections: ["Arte digital", "Colecionáveis"],
    releaseRank: 2,
    popularity: 4,
    imageUrl: "/nfts/emerald-ape-042.jpg",
    name: "Emerald Ape #042",
    priceEth: "1.19",
    available: true,
  },
  {
    id: "violet-nomad-314",
    network: "Polygon",
    collections: ["Arte digital", "Arte 3D"],
    releaseRank: 1,
    popularity: 2,
    imageUrl: "/nfts/violet-nomad-314.jpg",
    name: "Violet Nomad #314",
    priceEth: "1.39",
    available: false,
  },
  {
    id: "ivory-baron-088",
    network: "Ethereum",
    collections: ["Arte digital", "Colecionáveis"],
    releaseRank: 3,
    popularity: 3,
    imageUrl: "/nfts/ivory-baron-088.jpg",
    name: "Ivory Baron #088",
    priceEth: "1.79",
    available: true,
  },
  {
    id: "golden-beat-207",
    network: "Solana",
    collections: ["Arte digital", "Música"],
    releaseRank: 4,
    popularity: 1,
    imageUrl: "/nfts/golden-beat-207.jpg",
    name: "Golden Beat #207",
    priceEth: "0.99",
    available: true,
  },
];
const extraNfts = [
  ["sage-nomad-009", "Sage Nomad #009", "1.69", 1],
  ["neon-vessel-552", "Neon Vessel #552", "1.99", 2],
  ["cosmic-bloom-118", "Cosmic Bloom #118", "1.29", 1],
  ["golden-wave-121", "Golden Wave #121", "0.79", 3],
  ["golden-signal-160", "Golden Signal #160", "0.39", 3],
  ["emerald-dawn-061", "Emerald Dawn #061", "1.09", 0],
] as const;

const [emerald, violet, ivory, golden] = nfts;
const [sage, neon, cosmic, wave, signal, dawn] = extraNfts.map(([id, name, priceEth, artwork], index) => ({
  ...nfts[artwork], id, name, priceEth, available: true,
  releaseRank: -index, popularity: -index,
  ...(id === "neon-vessel-552" ? { previousPriceEth: "2.29" } : {}),
}));
const catalog = [emerald, sage, neon, cosmic, violet, ivory, golden, wave, signal, dawn];
function catalogWasUpdated() {
  return import.meta.env.VITE_MOCK_NFT_UPDATE === "true" && localStorage.getItem(catalogUpdateKey) === "1";
}

function readNfts() {
  if (!catalogWasUpdated()) return catalog;
  return catalog.map((nft) => nft.id === "emerald-ape-042" ? { ...nft, priceEth: "1.29" } : nft);
}

const comparePrice = (a: string, b: string): number => {
  const [wholeA, fractionA = ""] = a.split(".");
  const [wholeB, fractionB = ""] = b.split(".");
  const scale = Math.max(fractionA.length, fractionB.length);

  const valueA = BigInt(wholeA + fractionA.padEnd(scale, "0"));
  const valueB = BigInt(wholeB + fractionB.padEnd(scale, "0"));

  if (valueA < valueB) return -1;
  if (valueA > valueB) return 1;
  return 0;
};

type CartItem = {
  nftId: string;
  editionId: string;
  quantity: number;
};

const guestCartKey = "kurio:guest-cart";

function getEditions(nft: (typeof nfts)[number]) {
  return nft.available
    ? [
        { id: "standard", name: "Padrão", stock: nft.id === "emerald-ape-042" && catalogWasUpdated() ? 1 : 5 },
        { id: "limited", name: "Limitada", stock: 0 },
      ]
    : [{ id: "standard", name: "Padrão", stock: 0 }];
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;

  return (
    "nftId" in value && typeof value.nftId === "string" && value.nftId.length > 0 &&
    "editionId" in value && typeof value.editionId === "string" && value.editionId.length > 0 &&
    "quantity" in value && typeof value.quantity === "number" &&
    Number.isSafeInteger(value.quantity) && value.quantity > 0
  );
}

function readCart(key = cartStorageKey()): CartItem[] {
  const stored = localStorage.getItem(key);
  if (stored === null) return [];

  const items: unknown = JSON.parse(stored);
  if (!Array.isArray(items) || !items.every(isCartItem)) {
    throw new Error("Carrinho salvo inválido.");
  }

  return items;
}

function updateGuestCartItem(nftId: unknown, editionId: unknown, quantity?: number) {
  try {
    const items = readCart();
    const index = items.findIndex((item) => item.nftId === nftId && item.editionId === editionId);

    if (index < 0) {
      return HttpResponse.json({ message: "Item não encontrado no carrinho." }, { status: 404 });
    }

    if (quantity === undefined) {
      items.splice(index, 1);
    } else {
      const nft = readNfts().find((item) => item.id === nftId);
      const edition = nft && getEditions(nft).find((item) => item.id === editionId);

      if (!edition || quantity > edition.stock) {
        return HttpResponse.json(
          { message: "Quantidade solicitada excede o estoque da edição." },
          { status: 409 },
        );
      }

      items[index].quantity = quantity;
    }

    localStorage.setItem(cartStorageKey(), JSON.stringify(items));
    return new HttpResponse(null, { status: 204 });
  } catch {
    return HttpResponse.json({ message: "Não foi possível salvar o carrinho." }, { status: 500 });
  }
}

const couponKey = "kurio:guest-coupon";
function cartStorageKey() {
  const session = getDemoSession();
  return session && !session.legacy ? `kurio:cart:${session.user.id}` : guestCartKey;
}

function couponStorageKey() {
  const session = getDemoSession();
  return session && !session.legacy ? `kurio:coupon:${session.user.id}` : couponKey;
}

function mergeGuestCart(userId: string) {
  const guest = readCart(guestCartKey);
  const guestCoupon = localStorage.getItem(couponKey);
  if (!guest.length && !guestCoupon) return;

  const key = `kurio:cart:${userId}`;
  const items = readCart(key);
  const remaining: CartItem[] = [];
  for (const item of guest) {
    const nft = readNfts().find((entry) => entry.id === item.nftId);
    const edition = nft && getEditions(nft).find((entry) => entry.id === item.editionId);
    const existing = items.find((entry) => entry.nftId === item.nftId && entry.editionId === item.editionId);
    const moved = Math.min(item.quantity, Math.max(0, (edition?.stock ?? 0) - (existing?.quantity ?? 0)));
    if (moved > 0) {
      if (existing) existing.quantity += moved;
      else items.push({ ...item, quantity: moved });
    }
    if (item.quantity > moved) remaining.push({ ...item, quantity: item.quantity - moved });
  }

  localStorage.setItem(key, JSON.stringify(items));
  localStorage.setItem(guestCartKey, JSON.stringify(remaining));
  if (guestCoupon === "KURIO10" && !localStorage.getItem(`kurio:coupon:${userId}`)) {
    localStorage.setItem(`kurio:coupon:${userId}`, guestCoupon);
    localStorage.removeItem(couponKey);
  }
}

function readCartSummary() {
  const items = readCart().map((item) => {
    const nft = readNfts().find((entry) => entry.id === item.nftId);
    const edition = nft && getEditions(nft).find((entry) => entry.id === item.editionId);

    if (!nft || !edition) throw new Error("Item salvo não encontrado.");

    return { ...item, name: nft.name, imageUrl: nft.imageUrl, editionName: edition.name, stock: edition.stock, priceEth: nft.priceEth };
  });

  const coupon = localStorage.getItem(couponStorageKey()) === "KURIO10" ? "KURIO10" : null;
  const subtotal = items.reduce((sum, item) => sum + toWei(item.priceEth) * BigInt(item.quantity), 0n);
  const discount = coupon ? subtotal / 10n : 0n;
  const networkFee = items.length ? toWei("0.016") : 0n;

  return {
    items,
    coupon,
    summary: {
      subtotalEth: formatEth(subtotal),
      discountEth: formatEth(discount),
      networkFeeEth: formatEth(networkFee),
      totalEth: formatEth(subtotal - discount + networkFee),
    },
  };
}

function findOrder(userId: string, orderId: unknown) {
  const prefix = `kurio:order:${userId}:`;
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const record = JSON.parse(raw) as { fingerprint: string; order: Order };
    if (record.order.id === orderId) return { key, raw, record };
  }
}

function favoriteIds(userId: string): string[] {
  return JSON.parse(localStorage.getItem(`kurio:favorites:${userId}`) ?? "[]");
}

function updateFavorite(id: unknown, favorite: boolean) {
  const session = getDemoSession();
  if (!session) return sessionRequired();
  if (typeof id !== "string" || !readNfts().some((nft) => nft.id === id)) {
    return HttpResponse.json({ message: "NFT não encontrado." }, { status: 404 });
  }

  if (import.meta.env.VITE_MOCK_FAVORITES_FAILURE === "true") {
    return HttpResponse.json({ message: "Não foi possível atualizar os favoritos." }, { status: 503 });
  }

  const ids = new Set(favoriteIds(session.user.id));
  if (favorite) ids.add(id);
  else ids.delete(id);
  const result = [...ids];
  localStorage.setItem(`kurio:favorites:${session.user.id}`, JSON.stringify(result));
  return HttpResponse.json({ ids: result });
}

export const handlers = [
  http.get("/api/favorites", () => {
    const session = getDemoSession();
    return session ? HttpResponse.json({ ids: favoriteIds(session.user.id) }) : sessionRequired();
  }),
  http.put("/api/favorites/:id", ({ params }) => updateFavorite(params.id, true)),
  http.delete("/api/favorites/:id", ({ params }) => updateFavorite(params.id, false)),
  http.get("/api/orders/:id", ({ params }) => {
    const session = getDemoSession();
    if (!session) return sessionRequired();
    const saved = findOrder(session.user.id, params.id);
    return saved
      ? HttpResponse.json(saved.record.order)
      : HttpResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  }),
  http.post("/api/orders/:id/payment", async ({ request, params }) => {
    const body: unknown = await request.json().catch(() => null);
    const session = getDemoSession();
    if (!session) return sessionRequired();
    if (!body || typeof body !== "object" || !("approved" in body) || typeof body.approved !== "boolean") {
      return HttpResponse.json({ message: "Informe o resultado do pagamento." }, { status: 400 });
    }

    try {
      const saved = findOrder(session.user.id, params.id);
      if (!saved) return HttpResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
      const { order } = saved.record;
      if (order.status !== "pending") return HttpResponse.json(order);

      order.status = body.approved ? "confirmed" : "declined";
      if (body.approved) {
        order.confirmedAt = new Date().toISOString();
        order.transactionId = `sim-${crypto.randomUUID()}`;
        const remaining = readCart().flatMap((item) => {
          const purchased = order.quote.items.find(
            (line) => line.nftId === item.nftId && line.editionId === item.editionId,
          );
          const quantity = item.quantity - (purchased?.quantity ?? 0);
          return quantity > 0 ? [{ ...item, quantity }] : [];
        });

        localStorage.setItem(saved.key, JSON.stringify(saved.record));
        try {
          localStorage.setItem(cartStorageKey(), JSON.stringify(remaining));
        } catch (error) {
          localStorage.setItem(saved.key, saved.raw);
          throw error;
        }
      } else {
        localStorage.setItem(saved.key, JSON.stringify(saved.record));
      }
      publishOrderUpdate(session.user.id, order.id);
      return HttpResponse.json(order);
    } catch {
      return HttpResponse.json({ message: "Não foi possível registrar o pagamento." }, { status: 500 });
    }
  }),
  ...createSessionHandlers(mergeGuestCart),
  ...walletHandlers,
  http.post("/api/orders", async ({ request }) => {
    const body: unknown = await request.json().catch(() => null);
    const session = getDemoSession();
    if (!session) return sessionRequired();

    const key = request.headers.get("Idempotency-Key");
    if (!key || !/^[a-f0-9-]{36}$/i.test(key) ||
        !body || typeof body !== "object" ||
        !("walletId" in body) || typeof body.walletId !== "string" ||
        !("networkId" in body) || typeof body.networkId !== "string" ||
        !("reviewedQuote" in body) || typeof body.reviewedQuote !== "string" ||
        ("note" in body && (typeof body.note !== "string" || body.note.length > 500))) {
      return HttpResponse.json({ message: "Pedido inválido." }, { status: 400 });
    }

    const { walletId, networkId, reviewedQuote } = body;
    const note = "note" in body && typeof body.note === "string" ? body.note.trim() : "";
    const fingerprint = JSON.stringify([walletId, networkId, reviewedQuote, ...(note ? [note] : [])]);
    const storageKey = `kurio:order:${session.user.id}:${key}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const previous = JSON.parse(saved) as { fingerprint: string; order: Order };
        return previous.fingerprint === fingerprint
          ? HttpResponse.json(previous.order)
          : HttpResponse.json({ message: "Chave já usada para outro pedido." }, { status: 409 });
      }

      const wallet = readWallets(session.user.id).find((option) => option.id === walletId && option.address);
      if (!wallet?.networks.some((option) => option.id === networkId)) {
        return HttpResponse.json({ message: "Rede indisponível para esta carteira." }, { status: 422 });
      }

      const quote = readCartSummary();
      if (!quote.items.length || quote.items.some((item) => item.quantity > item.stock) ||
          JSON.stringify(quote) !== reviewedQuote) {
        return HttpResponse.json(
          { message: "O carrinho ou o estoque mudou. Verifique a cotação novamente." },
          { status: 409 },
        );
      }

      const order: Order = { id: crypto.randomUUID(), status: "pending", walletId, networkId, walletName: wallet.details?.type || wallet.name, quote, ...(note ? { note } : {}) };
      localStorage.setItem(storageKey, JSON.stringify({ fingerprint, order }));
      if (import.meta.env.VITE_MOCK_ORDER_TIMEOUT === "true") {
        await delay(orderRequestTimeoutMs + 1000);
      }
      return HttpResponse.json(order, { status: 201 });
    } catch {
      return HttpResponse.json({ message: "Não foi possível registrar o pedido." }, { status: 500 });
    }
  }),
  http.post("/api/checkout/quote", () => {
    if (!getDemoSession()) return sessionRequired();

    try {
      const quote = readCartSummary();
      if (!quote.items.length) {
        return HttpResponse.json({ message: "Seu carrinho está vazio." }, { status: 409 });
      }
      if (quote.items.some((item) => item.quantity > item.stock)) {
        return HttpResponse.json({ message: "O estoque mudou. Ajuste a quantidade no carrinho." }, { status: 409 });
      }
      return HttpResponse.json(quote);
    } catch {
      return HttpResponse.json({ message: "Não foi possível calcular a cotação." }, { status: 500 });
    }
  }),
  http.put("/api/cart/coupon", async ({ request }) => {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !("code" in body) || typeof body.code !== "string") {
      return HttpResponse.json({ message: "Informe o código do cupom." }, { status: 400 });
    }

    const code = body.code.trim().toUpperCase();
    if (code === "KURIOEXPIRADO") {
      return HttpResponse.json({ message: "Este cupom expirou." }, { status: 422 });
    }
    if (code !== "KURIO10") {
      return HttpResponse.json({ message: "Cupom inválido." }, { status: 422 });
    }

    localStorage.setItem(couponStorageKey(), code);
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete("/api/cart/coupon", () => {
    localStorage.removeItem(couponStorageKey());
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("/api/cart", () => {
    try {
      return HttpResponse.json(readCartSummary());
    } catch {
      return HttpResponse.json(
        { message: "Não foi possível carregar o carrinho." },
        { status: 500 },
      );
    }
  }),
  http.patch("/api/cart/items/:nftId/:editionId", async ({ request, params }) => {
    const body: unknown = await request.json().catch(() => null);
    const update = {
      nftId: params.nftId,
      editionId: params.editionId,
      quantity: body && typeof body === "object" && "quantity" in body ? body.quantity : undefined,
    };

    if (!isCartItem(update)) {
      return HttpResponse.json({ message: "Informe uma quantidade inteira positiva." }, { status: 400 });
    }

    return updateGuestCartItem(update.nftId, update.editionId, update.quantity);
  }),
  http.delete("/api/cart/items/:nftId/:editionId", ({ params }) =>
    updateGuestCartItem(params.nftId, params.editionId),
  ),
  http.post("/api/cart/items", async ({ request }) => {
    const body: unknown = await request.json().catch(() => null);
    if (!isCartItem(body)) {
      return HttpResponse.json(
        { message: "Informe o NFT, a edição e uma quantidade inteira positiva." },
        { status: 400 },
      );
    }

    const { nftId, editionId, quantity } = body;
    const nft = readNfts().find((item) => item.id === nftId);
    const edition = nft && getEditions(nft).find((item) => item.id === editionId);
    if (!edition) {
      return HttpResponse.json(
        { message: nft ? "Edição não encontrada." : "NFT não encontrado." },
        { status: 404 },
      );
    }

    try {
      const items = readCart();
      const existing = items.find(
        (item) => item.nftId === nftId && item.editionId === editionId,
      );
      const total = (existing?.quantity ?? 0) + quantity;

      if (total > edition.stock) {
        return HttpResponse.json(
          { message: "Quantidade solicitada excede o estoque da edição." },
          { status: 409 },
        );
      }

      if (existing) {
        existing.quantity = total;
      } else {
        items.push({ nftId, editionId, quantity });
      }

      localStorage.setItem(cartStorageKey(), JSON.stringify(items));
      return HttpResponse.json({ items }, { status: existing ? 200 : 201 });
    } catch {
      return HttpResponse.json(
        { message: "Não foi possível salvar o carrinho." },
        { status: 500 },
      );
    }
  }),


  http.get("/api/nfts/sidebar-featured", () => HttpResponse.json({
    nft: readNfts().find((nft) => nft.id === "violet-nomad-314") ?? null,
    collections: Object.fromEntries(catalog.flatMap((nft) => nft.collections).map((name) => [
      name, catalog.filter((nft) => nft.collections.includes(name)).length,
    ])),
    networks: Object.fromEntries(catalog.map(({ network }) => [
      network, catalog.filter((nft) => nft.network === network).length,
    ])),
  })),
  http.get("/api/nfts/collection-highlights", () => HttpResponse.json({
    items: readNfts().filter((nft) => nft.available),
  })),
  http.get("/api/nfts/related", ({ request }) => {
    const id = new URL(request.url).searchParams.get("id");
    const order = ["cosmic-bloom-118", "violet-nomad-314", "ivory-baron-088", "golden-beat-207", "golden-signal-160"];
    const items = readNfts().filter((nft) => nft.id !== id);
    return HttpResponse.json({
      items: [
        ...items.filter((nft) => !order.includes(nft.id)).slice(0, 1),
        ...order.flatMap((relatedId) => items.filter((nft) => nft.id === relatedId)),
        ...items.filter((nft) => !order.includes(nft.id)).slice(1),
      ].slice(0, 7),
    });
  }),
  http.get("/api/nfts/featured", () =>
    HttpResponse.json({ nft: readNfts().find((nft) => nft.id === "emerald-ape-042") ?? null }),
  ),
  http.get("/api/nfts/:id", ({ params }) => {
    const nft = readNfts().find((item) => item.id === params.id);

    if (!nft) {
      return HttpResponse.json(
        { message: "NFT não encontrado." },
        { status: 404 },
      );
    }

    const token = nft.name.split("#").at(-1);
    const collection = "Kurio Apes";
    return HttpResponse.json({
      ...nft, images: nft.id === "emerald-ape-042" ? Array<string>(4).fill(nft.imageUrl) : [nft.imageUrl], editions: getEditions(nft),
      description: `${nft.name} é uma peça digital da coleção ${collection}.`,
      attributes: [
        { label: "ID do token", value: `#${token}` },
        { label: "Coleção", value: collection },
        ...(nft.id === "emerald-ape-042" ? [{ label: "Atributos", value: "Óculos, Esmeralda, Raro" }] : []),
      ],
    });
  }),
  http.get("/api/nfts", async ({ request }) => {
    if (import.meta.env.VITE_E2E_SCENARIOS === "true" &&
        sessionStorage.getItem("kurio:e2e:catalog-failure") === "1") {
      await (window as Window & { waitForCatalogFailure?: () => Promise<void> }).waitForCatalogFailure?.();
      return HttpResponse.json({ message: "Catálogo indisponível." }, { status: 503 });
    }
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const availability = url.searchParams.get("availability");

    const sort = url.searchParams.get("sort");
    const collection = url.searchParams.get("collection");
    const network = url.searchParams.get("network");
    const minPrice = url.searchParams.get("minPrice");
    const maxPrice = url.searchParams.get("maxPrice");
    const results = readNfts().filter((nft) => {
      const matchesSearch = nft.name.toLowerCase().includes(q);
      if (collection && !nft.collections.includes(collection)) return false;
      if (network && nft.network !== network) return false;
      if (minPrice && /^\d+(\.\d+)?$/.test(minPrice) && comparePrice(nft.priceEth, minPrice) < 0) return false;
      if (maxPrice && /^\d+(\.\d+)?$/.test(maxPrice) && comparePrice(nft.priceEth, maxPrice) > 0) return false;
      const matchesAvailability = availability !== "available" || nft.available;

      return matchesSearch && matchesAvailability;
    });

    const view = url.searchParams.get("view");
    if (view === "new") results.sort((a, b) => b.releaseRank - a.releaseRank);
    if (view === "trending") results.sort((a, b) => b.popularity - a.popularity);

    if (sort === "price-desc") {
      results.sort((a, b) => comparePrice(b.priceEth, a.priceEth));
    }

    if (sort === "price-asc") {
      results.sort((a, b) => comparePrice(a.priceEth, b.priceEth));
    }

    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const page =
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;

    const pageSize = 9;
    const start = (page - 1) * pageSize;

    return HttpResponse.json({
      items: results.slice(start, start + pageSize),
      page,
      totalPages: Math.ceil(results.length / pageSize),
    });
  }),
];
