import { Button } from "./components/ui/button";
import type { ReactNode } from "react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import axios from "axios";
import type { WalletOption, WalletSelection } from "./wallet";

export function CheckoutWallet({ children, onSelectionChange }: {
  children: (selection: WalletSelection) => ReactNode;
  onSelectionChange: (wallet: WalletOption | undefined, network: string) => void;
}) {
  const router = useRouter();
  const [walletId, setWalletId] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [requesting, setRequesting] = useState(false);
  const wallets = useQuery({
    queryKey: ["checkout-wallets"],
    queryFn: async ({ signal }) => {
      const response = await axios.get<{ wallets: WalletOption[] }>("/api/wallets", { signal });
      return response.data.wallets.filter((wallet) => wallet.address);
    },
    retry: false,
  });
  const connection = useMutation({
    mutationFn: async (approved: boolean) => {
      const response = await axios.post<WalletSelection>("/api/wallet-connection", {
        walletId,
        networkId,
        approved,
      });
      return response.data;
    },
    onSettled: () => setRequesting(false),
  });

  const error = wallets.error ?? connection.error;
  const expired = axios.isAxiosError(error) && error.response?.status === 401;
  const message = axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message
    : undefined;
  const wallet = wallets.data?.find((option) => option.id === walletId);
  const network = wallet?.networks.find((option) => option.id === networkId);
  const locked = requesting || connection.isSuccess;

  function chooseWallet(id: string) {
    onSelectionChange(wallets.data?.find((option) => option.id === id), "");
    setWalletId(id);
    setNetworkId("");
    connection.reset();
  }

  function chooseNetwork(id: string) {
    onSelectionChange(wallet, wallet?.networks.find((option) => option.id === id)?.name ?? "");
    setNetworkId(id);
    connection.reset();
  }

  return (
    <section aria-labelledby="checkout-wallet" className="checkout-panel checkout-wallet">
      <h2 id="checkout-wallet" className="text-xl font-semibold">Carteira e rede</h2>
      {wallets.isPending && <p role="status">Carregando carteiras...</p>}
      {error && <p role="alert">{message ?? "Não foi possível acessar a carteira."}</p>}
      {expired ? (
        <button type="button" className="underline" onClick={() => void router.navigate({ to: "/login" })}>
          Entrar novamente
        </button>
      ) : wallets.isError ? (
        <button type="button" className="underline" onClick={() => void wallets.refetch()}>
          Tentar novamente
        </button>
      ) : wallets.data?.length === 0 ? (
        <Link to="/profile" className="underline">Cadastrar carteira no perfil</Link>
      ) : wallets.data && (
        <div className="checkout-wallet-fields">
          <div className="checkout-wallet-options">
            <fieldset disabled={locked}>
              <legend className="sr-only">Carteira</legend>
              <Link to="/profile" hash="profile-wallets" className="checkout-option checkout-wallet-manage">
                <span className="checkout-wallet-ring" aria-hidden="true" />
                <span className="sr-only">Gerenciar carteiras compatíveis</span>
                <span aria-hidden="true" className="checkout-wallet-brands">MetaMask · WalletConnect · Coinbase</span>
              </Link>
              {wallets.data.map((option) => (
                <label key={option.id} className="checkout-option">
                  <input type="radio" name="checkout-wallet-choice" value={option.id}
                    aria-label={option.name} checked={walletId === option.id}
                    onChange={() => chooseWallet(option.id)} />
                  <span>
                    <strong>{option.details?.type || option.name}</strong>
                    <small>{option.name} · {option.address.slice(0, 6)}…{option.address.slice(-4)}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            {wallet && <fieldset disabled={locked}>
              <legend>Rede</legend>
              {wallet?.networks.map((option) => (
                <label key={option.id} className="checkout-option">
                  <input type="radio" name="checkout-network-choice" value={option.id}
                    checked={networkId === option.id} onChange={() => chooseNetwork(option.id)} />
                  {option.name}
                </label>
              ))}
            </fieldset>}
          </div>

          {connection.isSuccess ? (
            <>
              <p role="status">Carteira {wallet?.name} conectada à rede {network?.name} na simulação.</p>
              <button type="button" className="justify-self-start underline" onClick={() => connection.reset()}>
                Desconectar
              </button>
              {children(connection.data)}
            </>
          ) : requesting ? (
            <div className="flex flex-wrap gap-4">
              <p className="w-full" role="status">
                {connection.isPending ? "Verificando conexão..." : "Autorizar a conexão simulada?"}
              </p>
              <button type="button" className="underline" disabled={connection.isPending} onClick={() => connection.mutate(true)}>Autorizar</button>
              <button type="button" className="underline" disabled={connection.isPending} onClick={() => connection.mutate(false)}>Recusar</button>
            </div>
          ) : (
            <Button
              type="button"
              className="justify-self-start"
              disabled={!wallet || !network}
              onClick={() => {
                connection.reset();
                setRequesting(true);
              }}
            >
              Conectar carteira
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
