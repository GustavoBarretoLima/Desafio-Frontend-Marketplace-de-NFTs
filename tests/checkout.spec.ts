import { scenarios } from "../playwright.scenarios";
import { expect, test, type Page } from "@playwright/test";

async function prepareCheckout(page: Page) {
  await page.goto("/");
  await page.getByRole("heading", { name: "Emerald Ape #042", exact: true }).getByRole("link").click();
  await expect(page).toHaveURL(/\/nfts\/emerald-ape-042$/);

  await page.getByLabel("Quantidade", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByText("NFT adicionado ao carrinho.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Carrinho", exact: true }).click();

  await expect(page.getByText("Quantidade 2", { exact: true })).toBeVisible();
  await page.getByLabel("Código promocional", { exact: true }).fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText("2.158 ETH", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();

  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.getByLabel("E-mail", { exact: true }).fill("teste@test.com");
  await page.getByLabel("Senha", { exact: true }).fill("teste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("button", { name: "Sair", exact: true })).toBeVisible();
  await expect(page.getByText("2.158 ETH", { exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Carteira e rede" })).toBeVisible();
  await page.getByRole("radio", { name: "Reserva", exact: true }).check();
  await page.getByRole("radio", { name: "Sepolia", exact: true }).check();
  await page.getByRole("button", { name: "Conectar carteira" }).click();
  await page.getByRole("button", { name: "Autorizar", exact: true }).click();
  await page.getByRole("button", { name: /Verificar cota/ }).click();
}

test("compra simulada do catálogo ao recibo", async ({ page }) => {
  await prepareCheckout(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await page.getByRole("link", { name: "Acompanhar pedido" }).click();

  await expect(page.getByText("Pagamento pendente", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Pagamento pendente", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Simular aprova/ }).click();

  const receipt = page.getByRole("region", { name: "Recibo do pedido" });
  await expect(receipt.getByText("Pagamento confirmado", { exact: true })).toBeVisible();
  await expect(receipt.getByText(/Emerald Ape #042/)).toBeVisible();
  await expect(receipt.locator(".receipt-totals").getByText("2.158 ETH", { exact: true })).toBeVisible();
  await expect(receipt.locator("dd[title]")).toHaveAttribute("title", /sim-[a-f0-9-]{36}/);
  await page.reload();
  await expect(receipt.locator(".receipt-totals").getByText("2.158 ETH", { exact: true })).toBeVisible();

  await receipt.getByRole("link", { name: "Fechar recibo e voltar ao carrinho" }).click();
  await expect(page.getByText("Seu carrinho está vazio.", { exact: true })).toBeVisible();
});

test("reconcilia o pedido pendente após perder o socket", async ({ page }) => {
  await prepareCheckout(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await page.getByRole("link", { name: "Acompanhar pedido" }).click();
  const url = page.url();
  await expect(page.getByText("Pagamento pendente", { exact: true })).toBeVisible();

  const orderPath = "/api" + new URL(url).pathname;
  const refreshed = page.waitForResponse((response) =>
    new URL(response.url()).pathname === orderPath && response.request().method() === "GET",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("kurio:e2e:disconnect")));
  expect((await refreshed).status()).toBe(200);
  await expect(page).toHaveURL(url);
  await expect(page.getByText("Pagamento pendente", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Simular aprova/ }).click();
  await expect(page.getByRole("region", { name: "Recibo do pedido" })).toBeVisible();
});

test("pagamento recusado preserva o carrinho e não gera recibo", async ({ page }) => {
  await prepareCheckout(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await page.getByRole("link", { name: "Acompanhar pedido" }).click();
  await page.getByRole("button", { name: "Simular recusa" }).click();
  await expect(page.getByText(/Pagamento recusado/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Pagamento recusado/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Recibo do pedido" })).toHaveCount(0);
  await page.getByRole("link", { name: "Voltar ao carrinho" }).click();
  await expect(page.getByText("Quantidade 2", { exact: true })).toBeVisible();
  await expect(page.getByText("2.158 ETH", { exact: true })).toBeVisible();
});

test.describe("timeout após salvar o pedido", () => {
  test.use({ baseURL: scenarios.orderTimeout });

  test("recupera o pedido original ao reenviar", async ({ page }) => {
    await prepareCheckout(page);
    const isOrderPost = (request: import("@playwright/test").Request) =>
      request.method() === "POST" && new URL(request.url()).pathname === "/api/orders";

    const firstRequest = page.waitForRequest(isOrderPost);
    await page.getByRole("button", { name: "Confirmar compra" }).click();
    const firstKey = (await firstRequest).headers()["idempotency-key"];
    expect(firstKey).toBeTruthy();
    await expect(page.getByRole("alert")).toContainText("A resposta demorou", { timeout: 12_000 });

    const retryResponse = page.waitForResponse((response) => isOrderPost(response.request()));
    await page.getByRole("button", { name: "Tentar envio novamente" }).click();
    const response = await retryResponse;
    expect(response.status()).toBe(200);
    expect(response.request().headers()["idempotency-key"]).toBe(firstKey);
    const order = await response.json();
    await page.getByRole("link", { name: "Acompanhar pedido" }).click();
    await expect(page).toHaveURL(new RegExp("/orders/" + order.id + "$"));
    await expect(page.getByText("Pagamento pendente", { exact: true })).toBeVisible();
  });
});
test.describe("alteração de estoque em tempo real", () => {
  test.use({ baseURL: scenarios.stockUpdate });

  test("atualiza o checkout e bloqueia o envio da cotação antiga", async ({ page }) => {
    await page.clock.install();
    await prepareCheckout(page);
    const submit = page.getByRole("button", { name: "Confirmar compra" });
    await expect(submit).toBeVisible();

    await page.clock.runFor(20_000);
    await expect(page.getByRole("status").filter({ hasText: /estoque do cat.log[oó] mudou/ })).toBeVisible();
    await expect(page.getByText("2.338 ETH", { exact: true })).toBeVisible();
    await expect(submit).toHaveCount(0);

    const quote = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/checkout/quote" &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /Verificar cota/ }).click();
    expect((await quote).status()).toBe(409);
    await expect(page.getByRole("alert").filter({ hasText: /O estoque mudou/ })).toBeVisible();
  });
});
