import { expect, test } from "@playwright/test";

test("personal mode syncs a (fictional) Trading 212 account with an access code", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page.getByText("Demo account")).toBeVisible();
  await expect(page.getByText("Read-only · personal mode")).toBeVisible();

  await page.getByLabel("Access code").fill("wrong-code");
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByText("That access code isn't right.")).toBeVisible();

  await page.getByLabel("Access code").fill("e2e-access-code");
  await page.getByRole("button", { name: "Sync now" }).click();
  const table = page.getByRole("table");
  await expect(table.getByText("Fictional World Index Fund (Acc)")).toBeVisible();
  await expect(table.getByText("£300.00")).toBeVisible();
  await expect(table.getByText("Synced").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Summary" }).getByText("£390.00")).toBeVisible();
  await expect(page.getByText(/Trading 212 reported a total of £412.50/)).toBeVisible();

  // Syncing again doesn't duplicate anything, and the code is remembered.
  await page.reload();
  await expect(page.getByLabel("Access code")).toHaveValue("e2e-access-code");
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(table.getByRole("row")).toHaveCount(3);
});
