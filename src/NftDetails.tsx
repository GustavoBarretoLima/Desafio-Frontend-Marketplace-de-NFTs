import { Skeleton } from "./components/ui/skeleton";
import { NftGallery } from "./NftGallery";
import { FavoriteButton } from "./FavoriteButton";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import axios from "axios";
import { cartQueryKey } from "./cart-query";
import { nftQueryOptions, type NftEdition } from "./nft-query";
import { MarketFooter } from "./MarketFooter";
import { SocialIcon } from "./FooterSocial";
import { MarketGuide } from "./HomeJournal";
import { RelatedNfts } from "./RelatedNfts";

const routeApi = getRouteApi("/nfts/$id");

export function NftDetails() {
  const { id } = routeApi.useParams();
  const [reviewsFor, setReviewsFor] = useState<string>();

  const {
    data: nft,
    isPending,
    error,
    refetch,
  } = useQuery(nftQueryOptions(id));

  if (isPending) {
    return (
      <div role="status" className="nft-detail-layout">
        <span className="sr-only">Carregando NFT...</span>
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="grid content-start gap-3">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="mt-4 h-10 w-40" />
          <Skeleton className="mt-3 h-10 w-3/4" />
        </div>
      </div>
    );
  }

  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return <h1>NFT não encontrado</h1>;
  }

  if (error || !nft) {
    return (
      <>
        <p role="alert">Não foi possível carregar o NFT.</p>
        <button type="button" onClick={() => void refetch()}>
          Tentar novamente
        </button>
      </>
    );
  }

  return (
    <div className="nft-product">
      <Link to="/" search={{ q: "", sort: undefined, availability: undefined, page: undefined }}
        hash="catalogo" className="nft-detail-back">
        Início / Mercado
      </Link>
      <div className="nft-detail-layout">
        <NftGallery key={nft.id} name={nft.name} images={nft.images} />
        <div className="nft-detail-info">
          <h1>{nft.name}</h1>
          <div className="nft-product-price">
            <p className="nft-detail-price">{nft.priceEth} ETH</p>
            {id === "emerald-ape-042" && <button type="button" onClick={() => {
              setReviewsFor(id);
              document.getElementById("nft-description-title")?.scrollIntoView();
            }}><span aria-hidden="true">★★★★☆ </span>19 avaliações de colecionadores</button>}
          </div>
          <p>{nft.available ? "Disponível" : "Esgotado"}</p>
          <strong>Sobre este NFT:</strong>
          <p className="nft-description">{nft.description}</p>
          <EditionPicker key={nft.id} nftId={nft.id} editions={nft.editions} />
          <dl className="nft-attributes">
            {nft.attributes.map(({ label, value }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <NftShare name={nft.name} />
        </div>
      </div>
      <section className="nft-product-details" aria-labelledby="nft-description-title">
        <h2 id="nft-description-title" className="sr-only">Informações do NFT</h2>
        <div className="nft-detail-tabs" role="group" aria-label="Informações do NFT">
          <button type="button" aria-pressed={reviewsFor !== id} onClick={() => setReviewsFor(undefined)}>Detalhes do NFT</button>
          {id === "emerald-ape-042" && <button type="button" aria-pressed={reviewsFor === id} onClick={() => setReviewsFor(id)}>
            Avaliações de colecionadores (19)
          </button>}
        </div>
        {reviewsFor === id ? <p>19 avaliações de colecionadores no cenário de demonstração.</p> : (
          <>
            {id === "emerald-ape-042" ? <>
              <p>Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.</p>
              <p>A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.</p>
              <dl className="nft-product-metadata">
                <div><dt>Rede</dt><dd>Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.</dd></div>
                <div><dt>Contrato</dt><dd>0x7A42…19E8 · ERC-721</dd></div>
                <div><dt>Direitos autorais</dt><dd>5% nas vendas secundárias, em mercados compatíveis.</dd></div>
              </dl>
            </> : <p>{nft.description}</p>}
          </>
        )}
      </section>
      <RelatedNfts key={nft.id} id={nft.id} />
      <MarketGuide />
      <MarketFooter product />
    </div>
  );
}

function NftShare({ name }: { name: string }) {
  const url = encodeURIComponent(window.location.origin + window.location.pathname);
  const title = encodeURIComponent(name);
  return (
    <div className="nft-share">
      <strong>Compartilhar este NFT:</strong>
      <a aria-label="Compartilhar no LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`} target="_blank" rel="noopener noreferrer"><SocialIcon name="LinkedIn" /></a>
      <a aria-label="Compartilhar por e-mail" href={`mailto:?subject=${title}&body=${url}`}><SocialIcon name="E-mail" /></a>
      <a aria-label="Compartilhar no Twitter" href={`https://twitter.com/intent/tweet?url=${url}&text=${title}`} target="_blank" rel="noopener noreferrer"><SocialIcon name="Twitter" /></a>
    </div>
  );
}

function EditionPicker({
  nftId,
  editions,
}: {
  nftId: string;
  editions: NftEdition[];
}) {
  const [editionId, setEditionId] = useState(
    () => editions.find((edition) => edition.stock > 0)?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const submitting = useRef(false);
  const queryClient = useQueryClient();
  const addToCart = useMutation({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartQueryKey }),
    mutationFn: (selection: { editionId: string; quantity: number }) =>
      axios.post("/api/cart/items", { nftId, ...selection }),
    retry: false,
  });
  const errorMessage = axios.isAxiosError<{ message?: string }>(addToCart.error)
    ? addToCart.error.response?.data?.message
    : undefined;

  const selectedEdition = editions.find(
    (edition) => edition.id === editionId && edition.stock > 0,
  );
  const selectedQuantity = selectedEdition ? Math.min(quantity, selectedEdition.stock) : 1;

  return (
    <form
      className="nft-purchase"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!selectedEdition || submitting.current) return;

        submitting.current = true;
        try {
          await addToCart.mutateAsync({
            editionId: selectedEdition.id,
            quantity: Math.min(quantity, selectedEdition.stock),
          });
        } catch {
          // O erro da API aparece no feedback da mutação.
        } finally {
          submitting.current = false;
        }
      }}
    >
      <fieldset className="nft-edition-options">
        <legend>Edição</legend>
        {editions.map((edition) => (
          <button key={edition.id} type="button"
            aria-pressed={selectedEdition?.id === edition.id}
            disabled={addToCart.isPending || edition.stock === 0}
            onClick={() => {
              addToCart.reset();
              setEditionId(edition.id);
              setQuantity(1);
            }}>
            {edition.name}{edition.stock === 0 ? " · Esgotada" : ""}
          </button>
        ))}
      </fieldset>

      {selectedEdition && (
        <>
          <label htmlFor="nft-quantity" className="sr-only">Quantidade</label>
          <div className="nft-quantity-controls">
          <button type="button" aria-label="Diminuir quantidade" disabled={addToCart.isPending || selectedQuantity <= 1}
            onClick={() => { addToCart.reset(); setQuantity(selectedQuantity - 1); }}>−</button>
          <select
            id="nft-quantity"
            value={selectedQuantity}
            disabled={addToCart.isPending}
            onChange={(event) => {
              addToCart.reset();
              setQuantity(Number(event.currentTarget.value));
            }}
          >
            {Array.from(
              { length: selectedEdition.stock },
              (_, index) => index + 1,
            ).map((amount) => (
              <option key={amount} value={amount}>
                {amount}
              </option>
            ))}
          </select>
          <button type="button" aria-label="Aumentar quantidade" disabled={addToCart.isPending || selectedQuantity >= selectedEdition.stock}
            onClick={() => { addToCart.reset(); setQuantity(selectedQuantity + 1); }}>+</button>
          </div>
        </>
      )}
      <button
        type="submit"
        disabled={!selectedEdition || addToCart.isPending}
        className="nft-purchase-submit"
      >
        {addToCart.isPending ? "Adicionando..." : "Adicionar ao carrinho"}
      </button>
      <FavoriteButton nftId={nftId} />

      <div className="nft-purchase-feedback">
        <p role="status">{addToCart.isSuccess ? "NFT adicionado ao carrinho." : ""}</p>
        {addToCart.isSuccess && <Link to="/cart">Ver carrinho</Link>}
        {addToCart.isError && (
          <p role="alert">{errorMessage ?? "Não foi possível adicionar o NFT ao carrinho."}</p>
        )}
      </div>
    </form>
  );
}
