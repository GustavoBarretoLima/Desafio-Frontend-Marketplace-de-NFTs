import { expect, test, type Page } from "@playwright/test";

async function signInFromProfile(page: Page, password = "teste") {
  await page.goto("/profile");
  await page.getByRole("link", { name: "Entrar para acessar o perfil" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("teste@test.com");
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
}

test("perfil persiste o nome e o avatar e permite trocar a senha", async ({ page }) => {
  await signInFromProfile(page);
  const name = page.getByLabel(/Nome de exibi/);
  await name.fill("Colecionador E2E");
  await page.getByLabel("Avatar", { exact: true }).setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGO41OMIAAPTAaB8YF9PAAAAAElFTkSuQmCC", "base64"),
  });
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();
  await page.reload();
  await expect(name).toHaveValue("Colecionador E2E");
  const avatar = page.getByRole("img", { name: "Avatar do colecionador" });
  await expect.poll(() => avatar.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1);

  const newPassword = "KurioNovaSenha123!";
  await page.getByLabel("Senha atual", { exact: true }).fill("incorreta");
  await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /senha atual.*incorreta/ })).toBeVisible();
  await page.getByLabel("Senha atual", { exact: true }).fill("teste");
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect(page.getByText("Senha alterada.")).toBeVisible();

  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("link", { name: "Entrar", exact: true })).toBeVisible();
  await signInFromProfile(page, newPassword);
  await expect(name).toHaveValue("Colecionador E2E");
});

test("valida o endereço, persiste a edição e oferece a carteira no checkout", async ({ page }) => {
  await signInFromProfile(page);
  await page.getByRole("link", { name: "Carteiras", exact: true }).click();
  const principal = page.locator("#wallet-principal");
  const form = page.locator("form").filter({ has: principal });
  const save = form.getByRole("button", { name: "Salvar carteira" });
  await principal.fill("endereco-invalido");
  await save.click();
  await expect(page.getByRole("alert").filter({ hasText: /40 caracteres/ })).toBeVisible();

  const address = "0x" + "ab".repeat(20);
  await principal.fill(address);
  await save.click();
  await expect(page.getByText("Carteira salva.")).toBeVisible();
  await page.reload();
  await expect(principal).toHaveValue(address);

  await page.goto("/nfts/emerald-ape-042");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByText("NFT adicionado ao carrinho.")).toBeVisible();
  await page.getByRole("link", { name: "Carrinho", exact: true }).click();
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();

  await expect(page.getByRole("heading", { name: "Carteira e rede" })).toBeVisible();
  const wallet = page.getByRole("group", { name: "Carteira", exact: true });
  await expect(wallet.getByText(/0xabab.*abab/)).toBeVisible();
  await wallet.getByRole("radio", { name: "Principal", exact: true }).check();
  await page.getByRole("radio", { name: "Ethereum", exact: true }).check();
  await page.getByRole("button", { name: "Conectar carteira" }).click();
  await page.getByRole("button", { name: "Autorizar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Principal.*Ethereum/ })).toBeVisible();
});
