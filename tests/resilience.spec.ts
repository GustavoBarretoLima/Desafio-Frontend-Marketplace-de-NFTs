import { expect, test } from "@playwright/test";

test("mantém o foco no diálogo e o devolve ao fechar pelo teclado", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("link", { name: "Entrar", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Acesso à conta" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);

  for (const key of ["Tab", "Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await expect(dialog.locator(":focus")).toHaveCount(1);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("mostra skeleton, informa falha do catálogo e recupera na nova tentativa", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const catalogUrl = (url: URL) => url.pathname === "/api/nfts";

  // Falhas de rede são aplicadas no próprio MSW, antes da resposta chegar ao Axios.
  await page.addInitScript(() => sessionStorage.setItem("kurio:e2e:catalog-failure", "1"));
  await page.exposeFunction("waitForCatalogFailure", () => pending);
  await page.goto("/");
  const catalog = page.locator(".home-catalog");
  try {
    await expect(catalog.getByText("Carregando NFTs...")).toBeAttached();
    await expect(catalog.locator(".skeleton").first()).toBeVisible();
  } finally {
    release();
  }

  await expect(catalog.getByRole("alert")).toBeVisible({ timeout: 12_000 });
  await page.evaluate(() => sessionStorage.removeItem("kurio:e2e:catalog-failure"));
  const response = page.waitForResponse((result) => catalogUrl(new URL(result.url())) && result.ok());
  await catalog.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await response;
  await expect(catalog.getByRole("heading", { name: "Emerald Ape #042", exact: true })).toBeVisible();
  await expect(catalog.getByRole("alert")).toHaveCount(0);
});
