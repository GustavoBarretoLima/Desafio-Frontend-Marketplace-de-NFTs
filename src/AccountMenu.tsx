import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import axios from "axios";
import { MobileNavIcon } from "./components/MobileNavIcon";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Login } from "./Login";

const sessionKey = ["session"] as const;

export type Session = {
  user: { id: string; email: string };
  expiresAt: number;
};

export async function refreshAccountState(client: QueryClient, session: Session | null) {
  await client.cancelQueries({ queryKey: sessionKey, exact: true });
  client.setQueryData(sessionKey, session);
  const accountQueries = ["cart", "checkout-wallets", "order", "profile", "favorites"];
  const filters = {
    predicate: (query: { queryKey: readonly unknown[] }) =>
      accountQueries.some((key) => query.queryKey[0] === key),
  };
  await client.cancelQueries(filters);
  client.removeQueries(filters);
  await client.resetQueries(filters);
}

export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: async ({ signal }) => {
      try {
        return (await axios.get<Session>("/api/session", { signal })).data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) return null;
        throw error;
      }
    },
    retry: false,
  });
}

export function useLogout() {
  const client = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => axios.delete("/api/session"),
    onSuccess: async () => {
      await refreshAccountState(client, null);
      await router.navigate({ to: "/cart", replace: true });
    },
  });
}

export function AccountMenu() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [authOpen, setAuthOpen] = useState(false);
  useLayoutEffect(() => {
    if (authOpen && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [authOpen]);
  const session = useSession();
  const logout = useLogout();

  return <>{session.data ? (
    <span className="inline-flex gap-4">
      <Link to="/profile" className="underline"><MobileNavIcon name="account" />Perfil</Link>
      <button type="button" className="underline" disabled={logout.isPending} onClick={() => logout.mutate()}>
        <MobileNavIcon name="logout" />
        Sair
      </button>
      {logout.isError && <span role="alert"> Não foi possível sair.</span>}
    </span>
  ) : (
    <Link to="/login" className="market-header-login" aria-haspopup="dialog" onClick={(event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      setAuthOpen(true);
    }}><MobileNavIcon name="logout" />Entrar</Link>
  )}
    {createPortal(<dialog ref={dialog} className="market-auth-dialog" aria-label="Acesso à conta"
      onClose={() => setAuthOpen(false)}>
      {authOpen && <Login onClose={() => dialog.current?.close()} />}
    </dialog>, document.body)}
  </>;
}
