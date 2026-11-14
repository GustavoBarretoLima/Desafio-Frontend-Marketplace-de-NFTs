import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import axios from "axios";
import { profileQueryOptions } from "./profile-query";
import type { WalletOption } from "./wallet";

export function CheckoutCollector({ wallet, network, note, setNote }: {
  wallet?: WalletOption;
  network: string;
  note: string;
  setNote: (value: string) => void;
}) {
  const profile = useQuery(profileQueryOptions);
  const expired = axios.isAxiosError(profile.error) && profile.error.response?.status === 401;
  const details = wallet?.details;

  return (
    <section aria-labelledby="checkout-collector" className="checkout-collector">
      <h2 id="checkout-collector">Perfil do colecionador</h2>
      {profile.isPending && <p role="status">Carregando dados do colecionador...</p>}
      {expired ? (
        <Link to="/login" className="underline">Entrar novamente</Link>
      ) : profile.isError ? (
        <>
          <p role="alert">Não foi possível carregar os dados do colecionador.</p>
          <button type="button" className="underline" onClick={() => void profile.refetch()}>Tentar novamente</button>
        </>
      ) : profile.data && (
        <>
          <div className="checkout-profile-fields">
            <CheckoutField label="Nome de exibição" value={details?.displayName || profile.data.name} />
            <CheckoutField label="Nome de usuário" value={profile.data.username} />
            <CheckoutField label="Rede" value={network} placeholder="Selecione em Carteira e rede" />
            <CheckoutField label="Nome do perfil" value={details?.profileName} />
            <CheckoutField label="Endereço da carteira" value={wallet?.address} placeholder="Endereço 0x da carteira" />
            <CheckoutField label="ENS ou carteira secundária" value={details?.secondary} placeholder="ENS ou carteira secundária (opcional)" hideLabel />
            <CheckoutField label="Tipo de carteira" value={details?.type} />
            <CheckoutField label="Código de indicação" value={details?.referral} />
            <CheckoutField label="E-mail" value={profile.data.email} />
            <CheckoutField label="Nome ENS" value={details?.ens || profile.data.ens} placeholder=".eth" />
          </div>
          <div className="checkout-profile-links">
            <a href="#checkout-wallet">Usar outra carteira?</a>
            <Link to="/profile">Editar dados do colecionador</Link>
          </div>
        </>
      )}
      <label className="checkout-note">Observação do colecionador (opcional)
        <textarea value={note} onChange={(event) => setNote(event.currentTarget.value)} maxLength={500} rows={5} />
      </label>
    </section>
  );
}

function CheckoutField({ label, value, placeholder, hideLabel }: { label: string; value?: string; placeholder?: string; hideLabel?: boolean }) {
  return <label><span className={hideLabel ? "sr-only" : undefined}>{label}</span><input readOnly value={value ?? ""} placeholder={placeholder} /></label>;
}
