import { useState } from "react";
import { refreshAccountState, type Session } from "./AccountMenu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter, useSearch } from "@tanstack/react-router";
import axios from "axios";

export function Login({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const client = useQueryClient();
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [validation, setValidation] = useState("");
  const register = useMutation({
    mutationFn: (credentials: { email: string; password: string; username?: string }) =>
      axios.post("/api/accounts", credentials),
    onSuccess: () => {
      setRegistering(false);
      setRegistered(true);
    },
  });
  const { orderId, returnTo, nftId } = useSearch({ strict: false });
  const login = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return (await axios.post<Session>("/api/session", credentials)).data;
    },
    onSuccess: async (session) => {
      await refreshAccountState(client, session);
      if (onClose) return onClose();
      if (nftId) return router.navigate({ to: "/nfts/$id", params: { id: nftId }, replace: true });
      return orderId
      ? router.navigate({ to: "/orders/$id", params: { id: orderId }, replace: true })
      : router.navigate({ to: returnTo === "profile" ? "/profile" : "/checkout", replace: true });
    },
  });

  const busy = login.isPending || register.isPending;
  function switchMode(next: boolean) {
    login.reset();
    register.reset();
    setRegistered(false);
    setShowPassword(false);
    setNotice("");
    setValidation("");
    setRegistering(next);
  }

  return (
    <section className="account-auth auth-panel" aria-labelledby="auth-title">
      {onClose ? <button type="button" onClick={onClose} className="auth-close" aria-label="Fechar">×</button> :
        <Link to="/" search={{ q: "", sort: undefined, availability: undefined, page: undefined }} className="auth-close" aria-label="Fechar">×</Link>}
      <h1 id="auth-title" className="sr-only">{registering ? "Criar conta" : "Entrar"}</h1>
      <div className="auth-modes" role="group" aria-label="Acesso à conta">
        <button type="button" aria-label="Já tenho conta" aria-pressed={!registering} disabled={busy} onClick={() => switchMode(false)}>Entrar</button>
        <button type="button" aria-label="Criar uma conta" aria-pressed={registering} disabled={busy} onClick={() => switchMode(true)}>Criar conta</button>
      </div>
      <p className="auth-intro">{registering ? "Crie seu perfil de colecionador e conecte uma carteira quando quiser." : "Entre para gerenciar sua carteira, coleção e perfil de criador."}</p>
      {registered && !registering && <p role="status" className="mb-4">Conta criada. Entre para continuar.</p>}
      <form
        key={String(registering)}
        className="account-auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (login.isPending || register.isPending) return;
          const fields = new FormData(event.currentTarget);
          const credentials = {
            email: String(fields.get("email") ?? ""),
            password: String(fields.get("password") ?? ""),
          };
          setValidation("");
          if (registering && fields.get("confirmPassword") !== credentials.password) {
            setValidation("As senhas precisam ser iguais.");
            return;
          }
          if (registering) register.mutate({ ...credentials, username: String(fields.get("username") ?? "").trim() });
          else login.mutate(credentials);
        }}
      >
        {registering && <input aria-label="Nome de usuário" name="username" autoComplete="username" placeholder="Nome de usuário" required maxLength={80} />}
        <label htmlFor="login-email" className="sr-only">E-mail</label>
        <input id="login-email" name="email" type="email" autoComplete="email" required placeholder={registering ? "Digite seu e-mail" : "contato@email.com"} />
        <label htmlFor="login-password" className="sr-only">Senha</label>
        <div className="account-auth-password">
          <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? 8 : undefined} maxLength={128} required placeholder="Senha" />
          <button type="button" aria-controls="login-password" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setShowPassword((visible) => !visible)}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
              <circle cx="12" cy="12" r="3" />
              {!showPassword && <path d="M3 21 21 3" />}
            </svg>
          </button>
        </div>
        {registering ? <input aria-label="Confirmar senha" name="confirmPassword" type="password" autoComplete="new-password" required maxLength={128} placeholder="Confirmar senha" /> :
          <button type="button" className="auth-recovery" onClick={() => setNotice("A recuperação de senha não está disponível na demonstração.")}>Esqueceu a senha?</button>}
        {validation && <p role="alert">{validation}</p>}
        {registering && register.isError && (
          <p role="alert">
            {axios.isAxiosError<{ message?: string }>(register.error)
              ? register.error.response?.data?.message ?? "Não foi possível criar a conta."
              : "Não foi possível criar a conta."}
          </p>
        )}
        {!registering && login.isError && (
          <p role="alert">
            {axios.isAxiosError(login.error) && login.error.response?.status === 401
              ? "E-mail ou senha inválidos."
              : "Não foi possível entrar. Tente novamente."}
          </p>
        )}
        <button type="submit" disabled={login.isPending || register.isPending} className="account-auth-submit">
          {registering ? (register.isPending ? "Criando..." : "Criar conta") : (login.isPending ? "Entrando..." : "Entrar")}
        </button>
      </form>
      <div className="auth-social">
        <p>Ou continue com</p>
        <button type="button" onClick={() => setNotice("O acesso com Google não está disponível na demonstração.")}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.1v5h6.6c3.9-3.6 6.1-8.8 6.1-14.8Z" />
            <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.7l-6.6-5c-1.8 1.2-4.2 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z" />
            <path fill="#FBBC05" d="M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18l6.8-5.2Z" />
            <path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3.1l5.9-5.9A19.2 19.2 0 0 0 24 4 20 20 0 0 0 5.8 15l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z" />
          </svg>
          Continuar com Google
        </button>
        <button type="button" onClick={() => setNotice("O acesso com Facebook não está disponível na demonstração.")}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="#5585d7">
            <path d="M14 24V13h3.7l.6-4H14V6.4c0-1.2.4-2 2.1-2H18V.8A24 24 0 0 0 15 .6c-3 0-5 1.8-5 5.2V9H7v4h3v11Z" />
          </svg>
          Continuar com Facebook
        </button>
        {notice && <p role="status">{notice}</p>}
      </div>
    </section>
  );
}
