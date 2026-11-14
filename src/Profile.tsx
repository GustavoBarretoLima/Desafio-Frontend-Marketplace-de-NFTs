import { ProfileWallets } from "./ProfileWallets";
import { ProfileFavorites } from "./ProfileFavorites";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { MobileNavIcon } from "./components/MobileNavIcon";
import { useLogout } from "./AccountMenu";
import axios from "axios";

import { profileQueryOptions, type ProfileData } from "./profile-query";
const input = "profile-input";
const button = "profile-submit";
const profileMenu = [
  { label: "Dados do perfil", icon: "account", hash: "dados-do-perfil" },
  { label: "Carteiras", icon: "wallet", hash: "profile-wallets" },
  { label: "Atividade", icon: "cart" },
  { label: "Lista de interesse", icon: "heart", hash: "profile-favorites" },
  { label: "Ofertas", icon: "offers" },
  { label: "Arquivos baixados", icon: "download" },
  { label: "Suporte", icon: "support" },
] as const;

function PasswordField({ id, name, label, current = false }: { id: string; name: string; label: string; current?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <div className="account-auth-password profile-password-field">
        <input id={id} name={name} type={visible ? "text" : "password"}
          autoComplete={current ? "current-password" : "new-password"} required maxLength={128}
          minLength={current ? undefined : 8} className={input} />
        <button type="button" aria-controls={id} aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
          onClick={() => setVisible((value) => !value)}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="3" />
            {!visible && <path d="M3 21 21 3" />}
          </svg>
        </button>
      </div>
    </div>
  );
}

function message(error: unknown) {
  return axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? "Não foi possível salvar. Tente novamente."
    : error instanceof Error ? error.message : "Não foi possível salvar.";
}

export function Profile() {
  const logout = useLogout();
  const hash = useLocation({ select: (location) => location.hash });
  const section = hash === "profile-wallets" || hash === "profile-favorites" ? hash : "dados-do-perfil";
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const client = useQueryClient();
  const profile = useQuery(profileQueryOptions);
  const save = useMutation({
    mutationFn: async ({ file, avatar, ...fields }: Omit<ProfileData, "email"> & { file: FormDataEntryValue | null }) => {
      if (file instanceof File && file.size) {
        if (file.size > 500_000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
          throw new Error("Escolha uma imagem PNG, JPEG ou WebP de até 500 KB.");
        }
        avatar = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
          reader.readAsDataURL(file);
        });
      }
      return (await axios.patch<ProfileData>("/api/profile", { ...fields, avatar })).data;
    },
    onSuccess: async (data) => {
      await client.cancelQueries({ queryKey: profileQueryOptions.queryKey });
      client.setQueryData(profileQueryOptions.queryKey, data);
    },
  });
  const password = useMutation({
    mutationFn: (body: { currentPassword: string; password: string }) =>
      axios.put("/api/profile/password", body),
  });
  const expired = [profile.error, save.error, password.error].some(
    (error) => axios.isAxiosError(error) && error.response?.status === 401,
  );

  return (
    <section aria-labelledby="profile-title">
      <h1 id="profile-title" className="sr-only">Perfil do colecionador</h1>
      {profile.isPending && <p role="status">Carregando perfil...</p>}
      {expired ? (
        <Link to="/login" search={{ returnTo: "profile" }} className="underline">Entrar para acessar o perfil</Link>
      ) : profile.isError ? (
        <div>
          <p role="alert">Não foi possível carregar o perfil.</p>
          <button type="button" className="underline" onClick={() => void profile.refetch()}>Tentar novamente</button>
        </div>
      ) : profile.data && (
        <div className="profile-layout">
          <nav aria-label="Seções do perfil" className="profile-navigation">
            <strong>Meu perfil</strong>
            {profileMenu.map((item) => {
              const content = <><MobileNavIcon name={item.icon} />{item.label}</>;
              return "hash" in item ? (
                <Link key={item.label} to="/profile" hash={item.hash}
                  activeOptions={{ exact: true, includeHash: true }}
                  data-selected={section === item.hash}
                  aria-current={section === item.hash ? "location" : undefined}>
                  {content}
                </Link>
              ) : <button key={item.label} type="button" disabled title="Indisponível na demonstração">{content}</button>;
            })}
            <button type="button" className="profile-logout" aria-label="Sair pelo menu do perfil"
              disabled={logout.isPending} onClick={() => logout.mutate()}>
              <MobileNavIcon name="logout" />Sair
            </button>
            {logout.isError && <p role="alert">Não foi possível sair.</p>}
          </nav>
          <div className="profile-content">
            {section === "dados-do-perfil" && <>
            <form id="dados-do-perfil" className="profile-panel profile-data-form" onSubmit={(event) => {
              event.preventDefault();
              if (save.isPending) return;
              const fields = new FormData(event.currentTarget);
              save.mutate({
                name: String(fields.get("name") ?? ""),
                username: String(fields.get("username") ?? ""),
                ens: String(fields.get("ens") ?? ""),
                walletNickname: String(fields.get("walletNickname") ?? ""),
                file: fields.has("removeAvatar") ? null : fields.get("avatar"),
                avatar: fields.has("removeAvatar") ? "" : profile.data.avatar,
              });
            }}>
              <h2>Perfil do colecionador</h2>
              <label>Nome de exibição<input key={profile.data.name} name="name" defaultValue={profile.data.name} required maxLength={80} className={input} /></label>
              <label>Nome de usuário<input name="username" defaultValue={profile.data.username} maxLength={80} className={input} /></label>
              <label>E-mail<input type="email" value={profile.data.email} readOnly className={input} /></label>
              <label>Nome ENS<input name="ens" defaultValue={profile.data.ens} placeholder="nome.eth" maxLength={80} className={input} /></label>
              <label>Apelido da carteira<input name="walletNickname" defaultValue={profile.data.walletNickname} maxLength={80} className={input} /></label>
              <div className="profile-avatar">
              <span>Avatar</span>
              <div className="profile-avatar-controls">
              {profile.data.avatar ? (
                <img src={profile.data.avatar} alt="Avatar do colecionador" width={48} height={48} className="size-12 rounded-full object-cover" />
              ) : <span className="profile-avatar-placeholder" aria-hidden="true"><MobileNavIcon name="account" /></span>}
              <label className="profile-avatar-upload">
                Alterar
                <input key={save.submittedAt + Number(save.isSuccess)} id="profile-avatar" aria-label="Avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" />
              </label>
              {profile.data.avatar && <label><input type="checkbox" name="removeAvatar" /> Remover avatar atual</label>}
              </div>
              </div>
              <button type="submit" disabled={save.isPending} className={button}>Salvar perfil</button>
              {save.isSuccess && <p role="status">Perfil salvo.</p>}
              {save.isError && <p role="alert">{message(save.error)}</p>}
            </form>
            <form id="senha-do-perfil" className="profile-panel" onSubmit={(event) => {
              event.preventDefault();
              if (password.isPending) return;
              const form = event.currentTarget;
              const fields = new FormData(form);
              const mismatch = fields.get("password") !== fields.get("confirmPassword");
              setPasswordMismatch(mismatch);
              if (mismatch) return;
              password.mutate({
                currentPassword: String(fields.get("currentPassword") ?? ""),
                password: String(fields.get("password") ?? ""),
              }, { onSuccess: () => form.reset() });
            }}>
              <h2 className="text-xl font-semibold">Alterar senha</h2>
              <PasswordField id="current-password" name="currentPassword" label="Senha atual" current />
              <PasswordField id="new-password" name="password" label="Nova senha" />
              <PasswordField id="confirm-new-password" name="confirmPassword" label="Confirmar nova senha" />
              {passwordMismatch && <p role="alert">As senhas precisam ser iguais.</p>}
              <button type="submit" disabled={password.isPending} className={button}>Alterar senha</button>
              {password.isSuccess && <p role="status">Senha alterada.</p>}
              {password.isError && <p role="alert">{message(password.error)}</p>}
            </form>
            </>}
            {section === "profile-wallets" && <ProfileWallets />}
            {section === "profile-favorites" && <ProfileFavorites />}
          </div>
        </div>
      )}
    </section>
  );
}
