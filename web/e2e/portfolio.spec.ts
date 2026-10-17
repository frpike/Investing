import path from "node:path";
import { expect, test } from "@playwright/test";

const fixture = path.join(__dirname, "../src/lib/__fixtures__/trading212-fictional.csv");

test("import a Trading 212 CSV, add a price, and run a what-if", async ({ page }) => {
  await page.goto("/portfolio");
  await page.locator('input[type="file"]').setInputFiles(fixture);
  await expect(page.getByText("6 of 8 rows read")).toBeVisible();
  await expect(page.getByText("1 row couldn't be read")).toBeVisible();
  await page.getByRole("button", { name: "Import", exact: true }).click();

  const table = page.getByRole("table");
  await expect(table.getByText("Fictional World Index Fund (Acc)")).toBeVisible();
  // No prices in the export: value is unknown, not £0.
  await expect(page.getByRole("region", { name: "Summary" }).getByText("Unknown").first()).toBeVisible();
  await expect(table.getByText("£0.00")).toHaveCount(0);

  await page.getByRole("button", { name: "Edit Fictional World Index Fund (Acc)" }).click();
  await page.getByLabel("Latest price per share (optional)").fill("115");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(table.getByText("£230.00")).toBeVisible();
  await expect(table.getByText("+£23.33")).toBeVisible();

  // Holding detail shows the working
  await table.getByRole("button", { name: "Fictional World Index Fund (Acc)", exact: true }).click();
  await expect(page.getByText(/Worked out as value £230.00 − cost £206.67/)).toBeVisible();

  await page.getByRole("link", { name: "What-if sandbox" }).click();
  await expect(page.getByText("Hypothetical.").first()).toBeVisible();
  await page.getByRole("button", { name: "One holding falls 10%" }).click();
  await expect(page.getByText("−£23.00")).toBeVisible();
});

test("manual entry validates input and keeps unknowns unknown", async ({ page }) => {
  await page.goto("/portfolio");
  await page.getByRole("tab", { name: "Add by hand" }).click();
  await page.getByRole("button", { name: "Add holding" }).last().click();
  await expect(page.getByText("Give the holding a name.")).toBeVisible();
  await page.getByLabel("Name").fill("Fictional Share");
  await page.getByLabel("Number of shares or units").fill("3");
  await page.getByRole("button", { name: "Add holding" }).last().click();
  await expect(page.getByRole("table").getByText("Fictional Share")).toBeVisible();
  await expect(page.getByRole("table").getByText("Unknown").first()).toBeVisible();
});
