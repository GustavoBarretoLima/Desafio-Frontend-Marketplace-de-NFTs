import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import axios from "axios";
import { useSession, type Session } from "./AccountMenu";
import { favoritesQueryOptions } from "./favorites-query";

export function FavoriteButton({ nftId }: { nftId: string }) {
  const session = useSession();
  if (session.isPending) return null;
  if (!session.data) {
    return <Link to="/login" search={{ nftId }} className="mt-4 inline-block underline">Entre para favoritar</Link>;
  }
  return <FavoriteToggle key={session.data.user.id + ":" + nftId} nftId={nftId} userId={session.data.user.id} />;
}

function FavoriteToggle({ nftId, userId }: { nftId: string; userId: string }) {
  const client = useQueryClient();
  const options = favoritesQueryOptions(userId);
  const key = options.queryKey;
  const isCurrentUser = () => client.getQueryData<Session>(["session"])?.user.id === userId;
  const favorites = useQuery(options);
  const toggle = useMutation({
    mutationFn: async (favorite: boolean) => {
      const url = `/api/favorites/${encodeURIComponent(nftId)}`;
      const response = favorite ? await axios.put<{ ids: string[] }>(url) : await axios.delete<{ ids: string[] }>(url);
      return response.data.ids;
    },
    onMutate: async (favorite) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<string[]>(key);
      if (isCurrentUser() && previous) {
        client.setQueryData(key, favorite ? [...previous, nftId] : previous.filter((id) => id !== nftId));
      }
      return previous;
    },
    onSuccess: (ids) => { if (isCurrentUser()) client.setQueryData(key, ids); },
    onError: (_error, _favorite, previous) => {
      if (isCurrentUser() && previous) client.setQueryData(key, previous);
    },
  });
  const selected = favorites.data?.includes(nftId) ?? false;
  const error = toggle.error ?? favorites.error;
  const expired = axios.isAxiosError(error) && error.response?.status === 401;

  return (
    <div className="mt-4 grid gap-2">
      {expired ? (
        <Link to="/login" search={{ nftId }} className="underline">Entrar novamente para favoritar</Link>
      ) : favorites.isError ? (
        <button type="button" className="justify-self-start underline" onClick={() => void favorites.refetch()}>
          Tentar carregar favoritos novamente
        </button>
      ) : (
        <button type="button" aria-pressed={selected} disabled={!favorites.data || toggle.isPending}
          className="justify-self-start rounded border border-white/20 px-3 py-2 disabled:opacity-50"
          onClick={() => toggle.mutate(!selected)}>
          {selected ? "★ Favorito" : "☆ Favoritar NFT"}
        </button>
      )}
      {error && !expired && <p role="alert">Não foi possível {toggle.isError ? "alterar o favorito" : "carregar os favoritos"}.</p>}
    </div>
  );
}
