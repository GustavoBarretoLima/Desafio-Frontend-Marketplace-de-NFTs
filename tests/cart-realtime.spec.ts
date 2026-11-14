import { scenarios } from "../playwright.scenarios";
import { expect, test } from "@playwright/test";

test("preserva o carrinho após recarregar e entrar na conta", async ({ page }) => {
  await page.goto("/nfts/emerald-ape-042");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByText(/NFT adicionado/)).toBeVisible();
  await page.getByRole("link", { name: "Carrinho", exact: true }).click();
  await page.getByRole("button", { name: /Aumentar quantidade de Emerald Ape/ }).click();
  const total = page.locator(".cart-item-total");
  await expect(total).toHaveText("2.38 ETH");
  await page.reload();
  await expect(total).toHaveText("2.38 ETH");

  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("teste@test.com");
  await page.getByLabel("Senha", { exact: true }).fill("teste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator(".checkout-item-quantity")).toHaveText(/2/);
  await page.getByRole("link", { name: "Carrinho", exact: true }).click();
  await expect(total).toHaveText("2.38 ETH");
  await page.getByRole("button", { name: /^Remover Emerald Ape/ }).click();
  await expect(page.getByText(/^Seu carrinho est/)).toBeVisible();
});

test.describe("entrega de eventos do catálogo", () => {
  test.use({ baseURL: scenarios.stockUpdate });

  test("ignora versões repetidas e antigas de um NFT", async ({ page }) => {
    await page.clock.install();
    await page.goto("/nfts/emerald-ape-042");
    await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
    await page.clock.runFor(20_000);
    await expect(page.getByRole("status").filter({ hasText: /estoque do cat.logo mudou/ })).toBeVisible();
    await expect(page.getByText("1.29 ETH", { exact: true }).first()).toBeVisible();
    await page.clock.runFor(500);

    const requests: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path === "/api/nfts/emerald-ape-042" || path === "/api/cart") requests.push(path);
    });
    await page.evaluate(() => window.dispatchEvent(new Event("kurio:e2e:replay-catalog")));
    await page.clock.runFor(500);
    expect(requests).toEqual([]);
    await expect(page.getByText("1.29 ETH", { exact: true }).first()).toBeVisible();
  });
});
