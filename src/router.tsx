import { Profile } from "./Profile";
import { AccountMenu } from "./AccountMenu";
import { MobileNavIcon } from "./components/MobileNavIcon";
import { OrderPage } from "./OrderPage";
import axios from "axios";
import { Login } from "./Login";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Cart } from "./Cart";
import { Checkout } from "./Checkout";
import { Home } from "./Home";
import { NftDetails } from "./NftDetails";
import { useQuery } from "@tanstack/react-query";
import { cartQueryOptions } from "./cart-query";

function HeaderCart() {
  const cart = useQuery(cartQueryOptions);
  const count = cart.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  return (
    <Link to="/cart" aria-label="Carrinho" className="market-header-cart" activeOptions={{ exact: true }}>
      <MobileNavIcon name="cart" />
      <span className="market-cart-label">Carrinho</span>
      {count > 0 && <span className="market-cart-count" aria-hidden="true">{count}</span>}
    </Link>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <>
      <header className="market-header">
        <div className="market-header-inner">
          <Link
            to="/"
            search={{
              q: "",
              sort: undefined,
              availability: undefined,
              page: undefined,
            }}
            className="market-brand"
          >
            KURIO
          </Link>
          <nav aria-label="Navegação principal" className="market-navigation">
            <Link to="/" activeOptions={{ exact: true, includeHash: true, includeSearch: false }} search={{ q: "", sort: undefined, page: undefined, availability: undefined }}>Início</Link>
            <Link to="/" hash="catalogo" search={({ q, sort, page, availability, view, collection, network, minPrice, maxPrice }) => ({ q: q ?? "", sort, page, availability, view, collection, network, minPrice, maxPrice })}>Mercado</Link>
            <Link to="/" hash="criadores" search={({ q, sort, page, availability, view, collection, network, minPrice, maxPrice }) => ({ q: q ?? "", sort, page, availability, view, collection, network, minPrice, maxPrice })}>Criadores</Link>
            <Link to="/" hash="home-guide-title" search={({ q, sort, page, availability, view, collection, network, minPrice, maxPrice }) => ({ q: q ?? "", sort, page, availability, view, collection, network, minPrice, maxPrice })}>Aprenda</Link>
          </nav>
          <nav aria-label="Início, conta e carrinho" className="market-actions">
            <Link
              to="/"
              search={{ q: "", sort: undefined, availability: undefined, page: undefined }}
              activeOptions={{ exact: true }}
              className="market-mobile-home"
            >
              <MobileNavIcon name="home" />
              Início
            </Link>
            <Link to="/" hash="nft-search" search={({ q, sort, page, availability, view, collection, network, minPrice, maxPrice }) => ({ q: q ?? "", sort, page, availability, view, collection, network, minPrice, maxPrice })}
              aria-label="Buscar NFTs" className="market-header-search">
              <MobileNavIcon name="search" />
            </Link>
            <HeaderCart />
            <AccountMenu />
          </nav>
        </div>
      </header>
      <main className="market-main">
        <Outlet />
      </main>
    </>
  ),
  notFoundComponent: () => (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Página não encontrada</h1>
      <Link
        to="/"
        search={{
          q: "",
          sort: undefined,
          availability: undefined,
          page: undefined,
        }}
        className="text-amber-300 underline"
      >
        Voltar para o início
      </Link>
    </>
  ),
});

const nftDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nfts/$id",
  component: NftDetails,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (search: Record<string, unknown>) => {
    const sort = search.sort;
    const page = search.page;

    return {
      q: typeof search.q === "string" ? search.q : "",
      sort: sort === "price-asc" || sort === "price-desc" ? sort : undefined,
      page:
        typeof page === "number" && Number.isSafeInteger(page) && page > 1
          ? page
          : undefined,
      availability:
        search.availability === "available" ? "available" : undefined,
      ...(search.view === "new" || search.view === "trending" ? { view: search.view } : {}),
      ...(typeof search.collection === "string" && search.collection ? { collection: search.collection } : {}),
      ...(typeof search.network === "string" && search.network ? { network: search.network } : {}),
      ...(/^\d+(\.\d+)?$/.test(String(search.minPrice)) ? { minPrice: String(search.minPrice) } : {}),
      ...(/^\d+(\.\d+)?$/.test(String(search.maxPrice)) ? { maxPrice: String(search.maxPrice) } : {}),
    };
  },
  component: Home,
});

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cart",
  component: Cart,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>): { orderId?: string; nftId?: string; returnTo?: "profile" } => ({
    returnTo: search.returnTo === "profile" ? "profile" : undefined,
    nftId: typeof search.nftId === "string" ? search.nftId : undefined,
    orderId: typeof search.orderId === "string" ? search.orderId : undefined,
  }),
  component: Login,
});

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout",
  beforeLoad: async ({ abortController }) => {
    try {
      await axios.get("/api/session", { signal: abortController.signal });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw redirect({ to: "/login", replace: true });
      }
      throw error;
    }
  },
  errorComponent: ({ reset }) => (
    <>
      <p role="alert">Não foi possível verificar a sessão.</p>
      <button type="button" className="underline" onClick={() => { reset(); void router.invalidate(); }}>Tentar novamente</button>
    </>
  ),
  component: Checkout,
});

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orders/$id",
  component: OrderPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: Profile,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute, nftDetailsRoute, cartRoute, checkoutRoute, loginRoute, orderRoute, profileRoute]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
