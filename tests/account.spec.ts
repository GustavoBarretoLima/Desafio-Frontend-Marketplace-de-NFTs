import { scenarios } from "../playwright.scenarios";
import { expect, test, type Page } from "@playwright/test";

test("Entrar abre e fecha o modal sem sair da Home", async ({ page }) => {
  await page.goto("/?q=");
  const url = page.url();
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Acesso à conta" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(url);
  await dialog.getByRole("button", { name: "Criar uma conta" }).click();
  await expect(dialog.getByLabel("Confirmar senha")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(url);
});

const detail = "/nfts/emerald-ape-042";
const demo = { email: "teste@test.com", password: "teste" };
const collector = { email: "colecionador-e2e@example.com", password: "KurioE2E123!" };

async function fillCredentials(page: Page, credentials: typeof collector) {
  await page.getByLabel("E-mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Senha", { exact: true }).fill(credentials.password);
}

async function signIn(page: Page, credentials: typeof collector) {
  await page.getByRole("link", { name: "Entre para favoritar" }).click();
  await fillCredentials(page, credentials);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(detail + "$"));
  await expect(page.getByRole("button", { name: "Sair", exact: true })).toBeVisible();
}

test("cadastro, login e troca de conta preservam os favoritos da conta original", async ({ page }) => {
  await page.goto(detail);
  await page.getByRole("link", { name: "Entre para favoritar" }).click();
  await page.getByRole("button", { name: "Criar uma conta" }).click();
  await fillCredentials(page, collector);
  await page.getByLabel("Nome de usuário").fill("colecionador");
  await page.getByLabel("Confirmar senha").fill(collector.password);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByText(/Conta criada/)).toBeVisible();

  await page.getByRole("button", { name: "Criar uma conta" }).click();
  await fillCredentials(page, collector);
  await page.getByLabel("Nome de usuário").fill("colecionador");
  await page.getByLabel("Confirmar senha").fill(collector.password);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/conta com este e-mail/i);

  await page.getByRole("button", { name: /J. tenho conta/ }).click();
  await fillCredentials(page, { ...collector, password: "SenhaErrada123!" });
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/E-mail ou senha/);
  await fillCredentials(page, collector);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(detail + "$"));

  await page.getByRole("button", { name: /Favoritar NFT/ }).click();
  await expect(page.getByRole("button", { pressed: true, name: /Favorito/ })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { pressed: true, name: /Favorito/ })).toBeEnabled();

  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("link", { name: "Entrar", exact: true })).toBeVisible();
  await page.goto(detail);
  await signIn(page, demo);
  await expect(page.getByRole("button", { pressed: false, name: /Favoritar NFT/ })).toBeEnabled();

  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("link", { name: "Entrar", exact: true })).toBeVisible();
  await page.goto(detail);
  await signIn(page, collector);
  await page.getByRole("button", { pressed: true, name: /Favorito/ }).click();
  await expect(page.getByRole("button", { pressed: false, name: /Favoritar NFT/ })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { pressed: false, name: /Favoritar NFT/ })).toBeEnabled();
});

test("sessão expirada pede login para favoritar", async ({ page }) => {
  await page.goto(detail);
  await signIn(page, demo);
  await page.evaluate(() => localStorage.setItem("kurio:demo-session", "1"));
  await page.reload();
  await expect(page.getByRole("link", { name: "Entre para favoritar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair", exact: true })).toHaveCount(0);
});

test.describe("falha ao atualizar favoritos", () => {
  test.use({ baseURL: scenarios.favoritesFailure });

  test("reverte o favorito quando a API retorna 503", async ({ page }) => {
    await page.goto(detail);
    await signIn(page, demo);

    const favorite = page.getByRole("button", { name: /Favoritar NFT/, pressed: false });
    await expect(favorite).toBeEnabled();

    const result = page.waitForResponse((response) =>
      response.request().method() === "PUT" &&
      new URL(response.url()).pathname === "/api/favorites/emerald-ape-042",
    );
    await favorite.click();

    expect((await result).status()).toBe(503);
    await expect(page.getByRole("alert")).toContainText(/alterar o favorito/i);
    await expect(favorite).toBeEnabled();
    await expect(page.getByRole("button", { name: /Favorito/, pressed: true })).toHaveCount(0);

    await page.reload();
    await expect(favorite).toBeEnabled();
  });
});
