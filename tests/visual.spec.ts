import { expect, test, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

async function addNftAndOpenCart(page: Page) {
  await page.goto("/nfts/emerald-ape-042");
  await page.getByLabel("Quantidade", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByText("NFT adicionado ao carrinho.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Carrinho", exact: true }).click();
  await expect(page.locator(".cart-item-total")).toHaveText("2.38 ETH");
}

async function capture(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await Promise.all(Array.from(document.querySelectorAll("main img"), async (image) => {
      const img = image as HTMLImageElement;
      if (img.loading === "lazy") img.loading = "eager";
      await img.decode();
    }));
  });
  await expect(page).toHaveScreenshot(name + ".png", {
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
}

test("home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Emerald Ape #042", exact: true })).toBeVisible();
  await capture(page, "home");
});

test("detalhe do NFT", async ({ page }) => {
  await page.goto("/nfts/emerald-ape-042");
  await expect(page.getByRole("heading", { name: "Emerald Ape #042", exact: true })).toBeVisible();
  await expect(page.locator(".nft-related li")).toHaveCount(5);
  await capture(page, "detalhe-nft");
});

test("carrinho", async ({ page }) => {
  await addNftAndOpenCart(page);
  await expect(page.locator(".nft-related li")).toHaveCount(5);
  await capture(page, "carrinho");
});

test("pagamento", async ({ page }) => {
  await addNftAndOpenCart(page);
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("teste@test.com");
  await page.getByLabel("Senha", { exact: true }).fill("teste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("radio", { name: "Reserva", exact: true }).check();
  await page.getByRole("radio", { name: "Sepolia", exact: true }).check();
  await expect(page.getByRole("button", { name: "Conectar carteira" })).toBeEnabled();
  await capture(page, "pagamento");
});
