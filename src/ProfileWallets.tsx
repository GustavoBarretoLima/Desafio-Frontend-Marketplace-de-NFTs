import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import axios from "axios";
import type { WalletOption } from "./wallet";
import { useState } from "react";

export function ProfileWallets() {
  const [showSecondary, setShowSecondary] = useState(false);
  const client = useQueryClient();
  const wallets = useQuery({
    queryKey: ["profile", "wallets"],
    queryFn: async ({ signal }) =>
      (await axios.get<{ wallets: WalletOption[] }>("/api/wallets", { signal })).data.wallets,
    retry: false,
  });
  const save = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Record<string, FormDataEntryValue> }) =>
      axios.put<WalletOption>(`/api/wallets/${encodeURIComponent(id)}`, fields),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["profile", "wallets"] }),
        client.invalidateQueries({ queryKey: ["checkout-wallets"] }),
      ]);
    },
  });
  const error = save.error ?? wallets.error;
  const apiError = axios.isAxiosError<{ message?: string }>(error) ? error : undefined;

  return (
    <section aria-labelledby="profile-wallets" className="profile-panel">
      <h2 id="profile-wallets" className="sr-only">Carteiras</h2>
      {wallets.isPending && <p role="status">Carregando carteiras...</p>}
      {error && <p role="alert">{apiError?.response?.data?.message ?? "Não foi possível acessar as carteiras."}</p>}
      {apiError?.response?.status === 401 ? (
        <Link to="/login" search={{ returnTo: "profile" }} className="underline">Entrar novamente</Link>
      ) : wallets.isError ? (
        <button type="button" className="justify-self-start underline" onClick={() => void wallets.refetch()}>Tentar novamente</button>
      ) : wallets.data?.map((wallet) => (
        <form key={wallet.id} className="wallet-profile-form" onSubmit={(event) => {
          event.preventDefault();
          if (save.isPending) return;
          const fields = new FormData(event.currentTarget);
          save.mutate({ id: wallet.id, fields: Object.fromEntries(fields) });
        }}>
          <div className="wallet-profile-heading">
            <h3>{wallet.id === "principal" ? "Carteira principal" : "Carteira secundária"}</h3>
            {wallet.id !== "principal" && (
              <button type="button" aria-expanded={showSecondary} aria-controls="secondary-wallet-fields"
                disabled={save.isPending} onClick={() => setShowSecondary((open) => !open)}>
                {showSecondary ? "Recolher" : wallet.address ? "Editar" : "Adicionar"}
              </button>
            )}
            <p>{wallet.id === "principal" ? "Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados." :
              wallet.address ? `${wallet.address.slice(0, 8)}…${wallet.address.slice(-4)}` : "Você ainda não adicionou uma carteira secundária."}</p>
          </div>
          <fieldset className="wallet-profile-fields" id={wallet.id !== "principal" ? "secondary-wallet-fields" : undefined}
            hidden={wallet.id !== "principal" && !showSecondary}
            disabled={save.isPending || (wallet.id !== "principal" && !showSecondary)}>
          <label>Nome de exibição<input className="profile-input" name="displayName" defaultValue={wallet.details?.displayName} /></label>
          <label>Apelido da carteira<input className="profile-input" name="nickname" defaultValue={wallet.details?.nickname} /></label>
          <label>Rede<select className="profile-input" name="network" defaultValue={wallet.details?.network ?? ""}>
            <option value="">Selecione uma rede</option>
            {wallet.networks.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </select></label>
          <label>Nome do perfil<input className="profile-input" name="profileName" defaultValue={wallet.details?.profileName} /></label>
          <div>
          <label htmlFor={`wallet-${wallet.id}`}>Endereço da carteira<span aria-hidden="true" className="wallet-required"> *</span></label>
          <input
            key={wallet.address}
            id={`wallet-${wallet.id}`}
            name="address"
            defaultValue={wallet.address}
            placeholder="Endereço 0x da carteira"
            autoComplete="off"
            spellCheck={false}
            required
            maxLength={42}
            className="profile-input"
          />
          </div>
          <label className="wallet-secondary-field"><span className="sr-only">ENS ou carteira secundária</span><input className="profile-input" name="secondary" placeholder="ENS ou carteira secundária (opcional)" defaultValue={wallet.details?.secondary} /></label>
          <label>Tipo de carteira<select className="profile-input" name="type" defaultValue={wallet.details?.type ?? ""}>
            <option value="">Selecione uma carteira</option><option>MetaMask</option><option>WalletConnect</option><option>Coinbase Wallet</option>
          </select></label>
          <label>Código de indicação<input className="profile-input" name="referral" defaultValue={wallet.details?.referral} /></label>
          <label>E-mail<input className="profile-input" name="email" type="email" defaultValue={wallet.details?.email} /></label>
          <div>
            <label htmlFor={`wallet-ens-${wallet.id}`}>Nome ENS</label>
            <div className="wallet-ens-field">
              <span aria-hidden="true">.eth</span>
              <input id={`wallet-ens-${wallet.id}`} className="profile-input" name="ens"
                placeholder="nome" defaultValue={wallet.details?.ens} />
            </div>
          </div>
          <button type="submit" className="profile-submit">Salvar carteira</button>
          </fieldset>
        </form>
      ))}
      {save.isSuccess && <p role="status">Carteira salva.</p>}
    </section>
  );
}
