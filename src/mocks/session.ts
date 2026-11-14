import { http, HttpResponse } from "msw";

const sessionKey = "kurio:demo-session";
const accountsKey = "kurio:accounts";
const demoUser = { id: "demo-collector", email: "teste@test.com" };
type User = typeof demoUser;
type Account = User & { salt: string; hash: string };

const demoPasswordKey = "kurio:demo-password";

async function passwordMatches(user: User, password: string) {
  if (password.length > 128) return false;
  const record = user.id === demoUser.id
    ? JSON.parse(localStorage.getItem(demoPasswordKey) ?? "null") as Pick<Account, "salt" | "hash"> | null
    : readAccounts().find((account) => account.id === user.id);
  if (!record) return user.id === demoUser.id && password === "teste";
  return (await hashPassword(password, record.salt)) === record.hash;
}

function readAccounts(): Account[] {
  return JSON.parse(localStorage.getItem(accountsKey) ?? "[]");
}

async function hashPassword(password: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 600_000 },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getDemoSession() {
  const stored = localStorage.getItem(sessionKey);
  if (!stored) return null;
  const record = JSON.parse(stored) as number | { userId: string; expiresAt: number };
  const legacy = typeof record === "number";
  const expiresAt = legacy ? record : record.expiresAt;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  const userId = legacy ? demoUser.id : record.userId;
  const user = userId === demoUser.id ? demoUser : readAccounts().find((account) => account.id === userId);
  return user ? { user: { id: user.id, email: user.email }, expiresAt, legacy } : null;
}

export function sessionRequired() {
  return HttpResponse.json({ message: "Sessão expirada ou ausente." }, { status: 401 });
}

export function createSessionHandlers(mergeGuestCart: (userId: string) => void) {
  return [
    http.get("/api/session", () => {
      const session = getDemoSession();
      return session ? HttpResponse.json({ user: session.user, expiresAt: session.expiresAt }) : sessionRequired();
    }),
    http.post("/api/accounts", async ({ request }) => {
      const details: unknown = await request.clone().json().catch(() => null);
      const username = details && typeof details === "object" && "username" in details && typeof details.username === "string"
        ? details.username.trim().slice(0, 80) : "";
      const body = await readCredentials(request);
      if (!body || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.password.length < 8 || body.password.length > 128) {
        return HttpResponse.json({ message: "Informe um e-mail válido e uma senha de 8 a 128 caracteres." }, { status: 400 });
      }

      const salt = crypto.randomUUID();
      const hash = await hashPassword(body.password, salt);
      const accounts = readAccounts();
      if (body.email === demoUser.email || accounts.some((account) => account.email === body.email)) {
        return HttpResponse.json({ message: "Já existe uma conta com este e-mail." }, { status: 409 });
      }

      const user = { id: crypto.randomUUID(), email: body.email };
      localStorage.setItem(accountsKey, JSON.stringify([...accounts, { ...user, salt, hash }]));
      if (username) localStorage.setItem(`kurio:profile:${user.id}`, JSON.stringify({ username }));
      return HttpResponse.json({ user }, { status: 201 });
    }),
    http.post("/api/session", async ({ request }) => {
      const body = await readCredentials(request);
      if (!body) return HttpResponse.json({ message: "Informe e-mail e senha." }, { status: 400 });

      const account = readAccounts().find((entry) => entry.email === body.email);
      const user = body.email === demoUser.email ? demoUser : account;
      if (!user || !await passwordMatches(user, body.password)) {
        return HttpResponse.json({ message: "E-mail ou senha inválidos." }, { status: 401 });
      }

      const previous = getDemoSession();
      if (previous?.legacy) mergeGuestCart(previous.user.id);
      mergeGuestCart(user.id);
      const expiresAt = Date.now() + 60 * 60 * 1000;
      localStorage.setItem(sessionKey, JSON.stringify({ userId: user.id, expiresAt }));
      return HttpResponse.json({ user: { id: user.id, email: user.email }, expiresAt });
    }),
    http.get("/api/profile", () => {
      const session = getDemoSession();
      if (!session) return sessionRequired();
      const { id, email } = session.user;
      const profile = JSON.parse(localStorage.getItem(`kurio:profile:${id}`) ?? "null");
      return HttpResponse.json({ email, name: "", avatar: "", ...profile });
    }),
    http.patch("/api/profile", async ({ request }) => {
      const body: unknown = await request.json().catch(() => null);
      const session = getDemoSession();
      if (!session) return sessionRequired();
      if (!body || typeof body !== "object" ||
          !("name" in body) || typeof body.name !== "string" ||
          !body.name.trim() || body.name.trim().length > 80 ||
          !("avatar" in body) || typeof body.avatar !== "string" ||
          body.avatar.length > 700_000 ||
          (body.avatar && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(body.avatar))) {
        return HttpResponse.json({ message: "Informe um nome de até 80 caracteres e uma imagem PNG, JPEG ou WebP de até 500 KB." }, { status: 400 });
      }
      const key = `kurio:profile:${session.user.id}`;
      const previous = JSON.parse(localStorage.getItem(key) ?? "{}");
      const fields = body as Record<string, unknown>;
      const extras = Object.fromEntries(["username", "ens", "walletNickname"].flatMap((field) =>
        typeof fields[field] === "string" ? [[field, fields[field].trim().slice(0, 80)]] : []));
      const profile = { ...previous, ...extras, name: body.name.trim(), avatar: body.avatar };
      localStorage.setItem(`kurio:profile:${session.user.id}`, JSON.stringify(profile));
      return HttpResponse.json({ email: session.user.email, ...profile });
    }),
    http.put("/api/profile/password", async ({ request }) => {
      const body: unknown = await request.json().catch(() => null);
      const session = getDemoSession();
      if (!session) return sessionRequired();
      if (!body || typeof body !== "object" ||
          !("currentPassword" in body) || typeof body.currentPassword !== "string" ||
          !("password" in body) || typeof body.password !== "string" ||
          body.password.length < 8 || body.password.length > 128) {
        return HttpResponse.json({ message: "Informe a senha atual e uma nova senha de 8 a 128 caracteres." }, { status: 400 });
      }
      const { user } = session;
      if (!await passwordMatches(user, body.currentPassword)) {
        return HttpResponse.json({ message: "A senha atual está incorreta." }, { status: 422 });
      }
      const salt = crypto.randomUUID();
      const hash = await hashPassword(body.password, salt);
      if (getDemoSession()?.user.id !== user.id) return sessionRequired();
      if (user.id === demoUser.id) {
        localStorage.setItem(demoPasswordKey, JSON.stringify({ salt, hash }));
      } else {
        localStorage.setItem(accountsKey, JSON.stringify(readAccounts().map((account) =>
          account.id === user.id ? { ...account, salt, hash } : account,
        )));
      }
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete("/api/session", () => {
      const session = getDemoSession();
      if (session?.legacy) mergeGuestCart(session.user.id);
      localStorage.removeItem(sessionKey);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

async function readCredentials(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" ||
      !("email" in body) || typeof body.email !== "string" ||
      !("password" in body) || typeof body.password !== "string") return null;
  return { email: body.email.trim().toLowerCase(), password: body.password };
}
