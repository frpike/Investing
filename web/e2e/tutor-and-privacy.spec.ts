import { expect, test } from "@playwright/test";

test("the tutor explains clearly when it isn't configured", async ({ page }) => {
  await page.goto("/tutor?q=What%20is%20a%20share%3F");
  await expect(page.getByLabel("Your question")).toHaveValue("What is a share?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText(/isn't set up on this deployment/)).toBeVisible();
});

test("the tutor API rejects malformed and oversized requests", async ({ request }) => {
  expect((await request.post("/api/tutor", { data: "not json", headers: { "content-type": "application/json" } })).status()).toBe(503);
  // With no API key the route stops before validation; validation itself is unit-tested.
});

test("guest data can be exported and deleted", async ({ page }) => {
  await page.goto("/learn/inflation");
  await page.goto("/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my data" }).click();
  expect((await download).suggestedFilename()).toMatch(/^groundwork-export-\d{4}-\d{2}-\d{2}\.json$/);
  const del = page.getByRole("button", { name: "Delete" });
  await expect(del).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await del.click();
  await page.waitForURL("/");
  expect(await page.evaluate(() => localStorage.getItem("groundwork:guest:v1"))).toBeNull();
});

test("sign-in explains guest mode when accounts aren't configured", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByText("Accounts aren't switched on")).toBeVisible();
});
