import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { nftQueryOptions } from "./nft-query";
import { useSession } from "./AccountMenu";
import { favoritesQueryOptions } from "./favorites-query";

export function ProfileFavorites() {
  const { data: session } = useSession();
  if (!session) return null;
  return <FavoritesList key={session.user.id} userId={session.user.id} />;
}

function FavoritesList({ userId }: { userId: string }) {
  const favorites = useQuery(favoritesQueryOptions(userId));

  return (
    <section aria-labelledby="profile-favorites" className="profile-panel">
      <h2 id="profile-favorites" className="text-xl font-semibold">Favoritos</h2>
      {favorites.isPending && <p role="status">Carregando favoritos...</p>}
      {favorites.isError && (
        <>
          <p role="alert">Não foi possível carregar os favoritos.</p>
          <button type="button" className="justify-self-start underline" onClick={() => void favorites.refetch()}>
            Tentar novamente
          </button>
        </>
      )}
      {favorites.isSuccess && (
        favorites.data.length === 0 ? <p>Você ainda não favoritou nenhum NFT.</p> : (
          <ul className="home-nft-grid">
            {favorites.data.map((id) => <FavoriteCard key={id} id={id} />)}
          </ul>
        )
      )}
    </section>
  );
}

function FavoriteCard({ id }: { id: string }) {
  const nft = useQuery(nftQueryOptions(id));

  return (
    <li className="home-nft-card">
      {nft.data?.images[0] && <img src={nft.data.images[0]} alt="" width={1254} height={1254} loading="lazy" className="home-nft-image" />}
      <h3>
        <Link to="/nfts/$id" params={{ id }}>{nft.data?.name ?? `Abrir NFT ${id}`}</Link>
      </h3>
      {nft.data && <p className="home-nft-price">{nft.data.priceEth} ETH</p>}
    </li>
  );
}
