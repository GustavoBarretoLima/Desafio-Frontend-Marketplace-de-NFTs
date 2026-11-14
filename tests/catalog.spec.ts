import { expect, test } from "@playwright/test";

test("visões do catálogo mudam a ordem e permanecem após recarregar", async ({ page }) => {
  await page.goto("/");
  const cards = page.getByRole("heading", { level: 3 });
  await page.getByRole("button", { name: "Novos lançamentos", exact: true }).click();
  await expect(cards.nth(0)).toHaveText("Golden Beat #207");
  await page.reload();
  await expect(page.getByRole("button", { name: "Novos lançamentos", pressed: true })).toBeVisible();
  await page.getByRole("button", { name: "Em alta", exact: true }).click();
  await expect(cards.nth(0)).toHaveText("Emerald Ape #042");
});

test("busca, filtro e ordenação persistem na URL e no histórico", async ({ page }) => {
  await page.goto("/");
  const cards = page.getByRole("heading", { level: 3 });
  const search = page.getByRole("searchbox", { name: "Buscar NFT" });
  const sort = page.getByLabel("Ordenar por");
  const available = page.getByRole("checkbox", { name: /Somente dispon/ });

  const filters = page.getByRole("button", { name: "Filtros", exact: true });
  await expect(search).toBeVisible();
  if (await filters.isVisible()) await filters.click();
  await sort.selectOption("price-desc");
  await expect(cards.nth(0)).toHaveText("Neon Vessel #552");
  await available.check();
  await expect(cards).toHaveCount(9);

  await search.fill("golden");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(cards).toHaveText(["Golden Beat #207", "Golden Wave #121", "Golden Signal #160"]);
  const params = new URL(page.url()).searchParams;
  expect(params.get("q")).toBe("golden");
  expect(params.get("sort")).toBe("price-desc");
  expect(params.get("availability")).toBe("available");

  await page.reload();
  await expect(search).toHaveValue("golden");
  if (await filters.isVisible()) await filters.click();
  await expect(sort).toHaveValue("price-desc");
  await expect(available).toBeChecked();
  await expect(cards).toHaveText(["Golden Beat #207", "Golden Wave #121", "Golden Signal #160"]);

  await page.goBack();
  await expect(search).toHaveValue("");
  await expect(cards).toHaveCount(9);

  await search.fill("sem-resultados");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("Nenhum NFT encontrado.")).toBeVisible();
});

test("paginação persiste ao recarregar e volta ao início ao filtrar", async ({ page }) => {
  await page.goto("/");
  const cards = page.getByRole("heading", { level: 3 });
  const previous = page.getByRole("button", { name: "Anterior" });
  const next = page.getByRole("button", { name: /Pr.xima/ });
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(page).toHaveURL(/[?&]page=2(?:&|$)/);
  await expect(cards).toHaveText(["Emerald Dawn #061"]);
  await expect(next).toBeDisabled();

  await page.reload();
  await expect(cards).toHaveText(["Emerald Dawn #061"]);
  await previous.click();
  await expect(cards).toHaveCount(9);

  await next.click();
  await expect(cards).toHaveText(["Emerald Dawn #061"]);
  const filters = page.getByRole("button", { name: "Filtros", exact: true });
  if (await filters.isVisible()) await filters.click();
  await page.getByRole("checkbox", { name: /Somente dispon/ }).check();
  await expect(page).not.toHaveURL(/[?&]page=/);
  await expect(cards.nth(0)).toHaveText("Emerald Ape #042");
  await expect(cards).toHaveCount(9);
  await expect(previous).toHaveCount(0);
});

test("detalhe funciona por acesso direto e trata NFT inexistente", async ({ page }) => {
  await page.goto("/nfts/emerald-ape-042");
  await expect(page.getByRole("heading", { name: "Emerald Ape #042", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Arte de Emerald Ape #042" })).toBeVisible();
  await expect(page.getByLabel("Quantidade", { exact: true })).toBeEnabled();

  const enlarge = page.getByRole("button", { name: "Ampliar arte de Emerald Ape #042" });
  await enlarge.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Arte ampliada de Emerald Ape #042" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Fechar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(enlarge).toBeFocused();

  await page.goto("/nfts/inexistente");
  await expect(page.getByRole("heading", { name: /NFT n.o encontrado/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toHaveCount(0);
});
