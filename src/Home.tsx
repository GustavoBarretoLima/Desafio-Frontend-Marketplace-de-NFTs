import { MarketFooter } from "./MarketFooter";
import { Skeleton } from "./components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { HomeJournal, MarketGuide } from "./HomeJournal";

const routeApi = getRouteApi("/");

const catalogViews = [
  { label: "Todos os NFTs", value: undefined },
  { label: "Novos lançamentos", value: "new" },
  { label: "Em alta", value: "trending" },
] as const;

const collections = ["Arte digital", "Fotografia", "Música", "Arte 3D", "Colecionáveis", "Generativa", "Jogos", "Assinaturas", "Utilidade"];
const priceFloor = 0.02;
const priceCeiling = 12.30;

type Nft = {
  id: string;
  name: string;
  priceEth: string;
  previousPriceEth?: string;
  imageUrl: string;
  available: boolean;
};
type NftPage = {
  items: Nft[];
  page: number;
  totalPages: number;
};

function FeaturedNft() {
  const featured = useQuery({
    queryKey: ["nfts", "featured"],
    queryFn: async ({ signal }) => {
      const { data } = await axios.get<{ nft: Nft | null }>("/api/nfts/featured", { signal });
      return data.nft;
    },
  });

  const nft = featured.data;
  return (
    <section aria-labelledby="home-title" className="home-hero">
      <div className="home-hero-copy">
        <p className="home-eyebrow">Bem-vindo à Kurio</p>
        <h1 id="home-title">
          Seja dono do futuro da arte digital
        </h1>
        <p className="home-hero-description">
          Descubra NFTs selecionados de criadores emergentes e consagrados.
          Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
        </p>
        <a href="#catalogo" className="home-cta">
          Explorar
        </a>
      </div>
      {featured.isPending && (
        <div role="status" className="home-hero-art">
          <span className="sr-only">Carregando destaque...</span>
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="mt-2 h-6 w-40" />
          <Skeleton className="h-6 w-20" />
        </div>
      )}
      {featured.isError && (
        <div>
          <p role="alert">Não foi possível carregar o destaque.</p>
          <button type="button" className="underline" onClick={() => void featured.refetch()}>Tentar novamente</button>
        </div>
      )}
      {nft && (
        <Link to="/nfts/$id" params={{ id: nft.id }} className="home-hero-art">
          <img
            src={nft.imageUrl}
            alt=""
            width={1254}
            height={1254}
            fetchPriority="high"
            className="home-hero-image"
          />
          <span className="sr-only">{nft.name}, {nft.priceEth} ETH</span>
        </Link>
      )}
    </section>
  );
}

function HomeCollections() {
  const highlights = useQuery({
    queryKey: ["nfts", "collection-highlights"],
    queryFn: async ({ signal }) =>
      (await axios.get<{ items: Nft[] }>("/api/nfts/collection-highlights", { signal })).data.items,
  });

  return (
    <div className="home-collections">
      {highlights.isPending && <Skeleton className="h-52 w-full rounded-xl" />}
      {highlights.isError && (
        <button type="button" onClick={() => void highlights.refetch()}>Tentar carregar destaques novamente</button>
      )}
      {!!highlights.data?.length && (
        <>
          <section id="criadores" aria-label="Destaques da coleção" className="home-promos">
            {highlights.data.slice(0, 2).map((nft, index) => (
              <article key={nft.id} className="home-promo">
                <img src={nft.imageUrl} alt="" width={1254} height={1254} loading="lazy" />
                <div>
                  <strong>{index === 0 ? "Lançamentos gênesis de edição limitada" : "Arte digital selecionada e muito mais"}</strong>
                  <p>{index === 0 ? "Colecione edições escassas diretamente dos criadores." : "Explore novas coleções e obras digitais."}</p>
                  <Link to="/nfts/$id" params={{ id: nft.id }} className="home-cta">Explorar →</Link>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
      <HomeJournal />
      <MarketGuide />
    </div>
  );
}

export function Home() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate({ from: "/" });
  const { q, sort, availability, view, collection, network, minPrice, maxPrice, page = 1 } = routeApi.useSearch();
  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice, low: Number(minPrice ?? priceFloor), high: Number(maxPrice ?? priceCeiling) });
  if (priceDraft.min !== minPrice || priceDraft.max !== maxPrice) {
    setPriceDraft({ min: minPrice, max: maxPrice, low: Number(minPrice ?? priceFloor), high: Number(maxPrice ?? priceCeiling) });
  }
  const featured = useQuery({
    queryKey: ["nfts", "sidebar-featured"],
    queryFn: async ({ signal }) =>
      (await axios.get<{ nft: Nft | null; collections: Record<string, number>; networks: Record<string, number> }>("/api/nfts/sidebar-featured", { signal })).data,
  });
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["nfts", q, sort, availability, view, collection, network, minPrice, maxPrice, page],
    queryFn: async ({ signal }) => {
      const response = await axios.get<NftPage>("/api/nfts", {
        params: { q, sort, availability, view, collection, network, minPrice, maxPrice, page },
        signal,
      });
      return response.data;
    },
  });

  function goToPage(nextPage: number) {
    void navigate({
      search: (prev) => ({
        ...prev,
        page: nextPage > 1 ? nextPage : undefined,
      }),
    });
  }

  return (
    <div className="market-home">
      <FeaturedNft />
      <section className="home-catalog" aria-labelledby="catalogo">
        <h2 id="catalogo" className="home-catalog-title">Catálogo de NFTs</h2>
        <div className="home-filters">
          <form
            className="home-filter-fields home-search"
            onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              const term = String(fields.get("q") ?? "").trim();
              void navigate({
                search: (prev) => ({ ...prev, q: term, page: undefined }),
              });
            }}
          >
            <label htmlFor="nft-search">Buscar NFT</label>
            <input
              key={q}
              id="nft-search"
              name="q"
              type="search"
              placeholder="Explorar coleções"
              defaultValue={q}
              className="rounded border border-white/20 px-3 py-2"
            />
            <button type="submit">Buscar</button>
          </form>
          <button
            type="button"
            className="home-filter-toggle"
            aria-expanded={filtersOpen}
            aria-controls="catalog-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            Filtros{(sort || availability) && <span aria-hidden="true"> •</span>}
          </button>
          <div
            id="catalog-filters"
            className="home-filter-fields home-filter-options"
            data-open={filtersOpen}
          >
            <div className="home-collection-filters" role="group" aria-label="Coleções">
              <p className="home-filter-heading">Coleções</p>
              {collections.map((name) => (
                <button key={name} type="button" aria-pressed={collection === name}
                  onClick={() => void navigate({
                    search: (previous) => ({ ...previous, collection: collection === name ? undefined : name, page: undefined }),
                  })}>
                  {name}
                  {featured.data && <span>({featured.data.collections[name] ?? 0})</span>}
                </button>
              ))}
            </div>
            <form className="home-price-filter home-filter-fields" onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              const min = String(fields.get("minPrice") ?? "");
              const max = String(fields.get("maxPrice") ?? "");
              void navigate({ search: (previous) => ({
                ...previous, minPrice: min || undefined, maxPrice: max || undefined, page: undefined,
              }) });
            }}>
              <p className="home-filter-heading">Faixa de preço</p>
              <div className="home-price-sliders">
                <input aria-label="Mínimo em ETH" name="minPrice" type="range" min={priceFloor} max={priceCeiling} step=".01"
                  value={priceDraft.low} onChange={(event) => setPriceDraft({ ...priceDraft, low: Math.min(event.currentTarget.valueAsNumber, priceDraft.high) })} />
                <input aria-label="Máximo em ETH" name="maxPrice" type="range" min={priceFloor} max={priceCeiling} step=".01"
                  value={priceDraft.high} onChange={(event) => setPriceDraft({ ...priceDraft, high: Math.max(event.currentTarget.valueAsNumber, priceDraft.low) })} />
              </div>
              <p>Preço: {priceDraft.low.toFixed(2).replace(".", ",")} – {priceDraft.high.toFixed(2).replace(".", ",")} ETH</p>
              <button type="submit">Aplicar</button>
            </form>
            <div className="home-collection-filters" role="group" aria-label="Rede">
              <p className="home-filter-heading">Rede</p>
              {["Ethereum", "Polygon", "Solana"].map((name) => (
                <button key={name} type="button" aria-pressed={network === name}
                  onClick={() => void navigate({ search: (previous) => ({
                    ...previous, network: network === name ? undefined : name, page: undefined,
                  }) })}>
                  {name}
                  {featured.data && <span>({featured.data.networks[name] ?? 0})</span>}
                </button>
              ))}
            </div>
            <label className="home-availability">
              <input
                type="checkbox"
                checked={availability === "available"}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;

                  void navigate({
                    search: (prev) => ({
                      ...prev,
                      availability: checked ? "available" : undefined,
                      page: undefined,
                    }),
                  });
                }}
              />
              Somente disponíveis
            </label>

          </div>
        </div>
        {featured.data?.nft && (
          <aside aria-label="NFT em destaque" className="home-sidebar-featured">
            <h2>NFT em destaque</h2>
            <p>Oferta limitada</p>
            <Link to="/nfts/$id" params={{ id: featured.data.nft.id }}>
              <img src={featured.data.nft.imageUrl} alt="" width={1254} height={1254} loading="lazy" />
              <span>{featured.data.nft.name}</span>
            </Link>
          </aside>
        )}
        <div className="home-results">
          <div className="home-catalog-toolbar">
          <div className="catalog-views" role="group" aria-label="Exibição do catálogo">
            {catalogViews.map(({ label, value }) => (
              <button key={label} type="button" aria-pressed={view === value}
                onClick={() => void navigate({ search: (previous) => ({ ...previous, view: value, page: undefined }) })}>
                {label}
              </button>
            ))}
          </div>
            <div className="home-catalog-sort">
            <label htmlFor="nft-sort">Ordenar por</label>
            <select
              id="nft-sort"
              value={sort ?? ""}
              className="rounded border border-white/20 px-3 py-2"
              onChange={(event) => {
                const value = event.currentTarget.value;
                const nextSort =
                  value === "price-asc" || value === "price-desc"
                    ? value
                    : undefined;

                void navigate({
                  search: (prev) => ({ ...prev, sort: nextSort, page: undefined }),
                });
              }}
            >
              <option value="">Listados recentemente</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
            </div>
          </div>
          {isPending && (
            <div role="status" className="home-nft-grid">
              <span className="sr-only">Carregando NFTs...</span>
              {[0, 1].map((index) => (
                <div key={index} className="home-nft-card">
                  <Skeleton className="mb-3 aspect-square w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <>
              <p role="alert">Não foi possível carregar os NFTs.</p>
              <button type="button" onClick={() => void refetch()}>
                Tentar novamente
              </button>
            </>
          )}

          {data?.totalPages === 0 && <p>Nenhum NFT encontrado.</p>}

          {data && data.items.length > 0 && (
            <ul className="home-nft-grid">
              {data.items.map((nft) => (
                <li key={nft.id} className="home-nft-card">
                  <img
                    src={nft.imageUrl}
                    alt=""
                    width={1254}
                    height={1254}
                    loading="lazy"
                    className="home-nft-image"
                  />
                  <h3 className="font-semibold">
                    <Link
                      to="/nfts/$id"
                      params={{ id: nft.id }}
                    >
                      {nft.name}
                    </Link>
                  </h3>
                  <p className="home-nft-price">
                    {nft.priceEth} ETH
                    {nft.previousPriceEth && <del className="home-previous-price"> {nft.previousPriceEth} ETH</del>}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {data && page > Math.max(1, data.totalPages) && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p>Esta página não está disponível.</p>
              <button
                type="button"
                className="underline"
                onClick={() => goToPage(1)}
              >
                Voltar para a primeira página
              </button>
            </div>
          )}

          {data && data.totalPages > 1 && page <= data.totalPages && (
            <nav
              aria-label="Paginação do catálogo"
              className="home-pagination"
            >
              <button
                type="button"
                aria-label="Anterior"
                className="disabled:opacity-50"
                disabled={page === 1}
                onClick={() => goToPage(page - 1)}
              >
                ‹
              </button>
              <span role="status" className="sr-only">
                Página {page} de {data.totalPages}
              </span>
              {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((number) => (
                <button key={number} type="button" aria-label={`Página ${number}`}
                  aria-current={page === number ? "page" : undefined} onClick={() => goToPage(number)}>
                  {number}
                </button>
              ))}
              <button
                aria-label="Próxima"
                type="button"
                className="disabled:opacity-50"
                disabled={page === data.totalPages}
                onClick={() => goToPage(page + 1)}
              >
                ›
              </button>
            </nav>
          )}
        </div>
      </section>
      <HomeCollections />
      <MarketFooter product />
    </div>
  );
}
