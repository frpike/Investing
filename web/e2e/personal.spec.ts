import { expect, test } from "@playwright/test";

// Personal mode keeps progress in a file on the computer, so it survives a new browser profile.
test("progress and holdings follow you to a fresh browser, and projections work", async ({ browser }) => {
  const a = await browser.newContext();
  const pa = await a.newPage();
  await pa.goto("/portfolio");
  await pa.getByLabel("Access code").fill("e2e-access-code");
  await pa.getByRole("button", { name: "Sync now" }).click();
  await expect(pa.getByText("Progress saved on this computer")).toBeVisible();

  // Complete a lesson quiz in browser A.
  await pa.goto("/learn/inflation");
  await pa.getByRole("radio", { name: "It falls by roughly 2%" }).check();
  await pa.getByRole("radio", { name: "Inflation can erode what it buys over many years" }).check();
  await pa.getByRole("radio", { name: "Exactly the same amount as £100 bought last year" }).check();
  await pa.getByRole("button", { name: "Check my answers" }).click();
  await expect(pa.getByText("Lesson complete.")).toBeVisible();
  await pa.waitForTimeout(500);
  await a.close();

  // Browser B has no local data; entering the code brings everything back.
  const b = await browser.newContext();
  const pb = await b.newPage();
  await pb.goto("/portfolio");
  await pb.getByLabel("Access code").fill("e2e-access-code");
  await pb.getByRole("button", { name: "Sync now" }).click();
  await expect(pb.getByRole("table").getByText("Fictional World Index Fund (Acc)")).toBeVisible();
  await pb.goto("/learn");
  await expect(pb.getByRole("link", { name: /Inflation and purchasing power.*Done/ })).toBeVisible();

  // A reload in browser B reconnects automatically (the code is remembered).
  await pb.reload();
  await expect(pb.getByText("Saved on this computer")).toBeVisible();

  // Projections and a trial purchase.
  await pb.goto("/portfolio/forecast");
  await expect(pb.getByText("Range of possible outcomes")).toBeVisible();
  await expect(pb.getByText(/8 in 10 simulated futures ended between/)).toBeVisible();
  // The page may still be hydrating; retry until the typed name sticks.
  await expect(async () => {
    await pb.getByLabel("Name").fill("Fictional Bond Fund");
    await expect(pb.getByLabel("Name")).toHaveValue("Fictional Bond Fund", { timeout: 500 });
  }).toPass();
  await pb.getByLabel("Type").selectOption("bond");
  await pb.getByLabel(/^Amount/).fill("300");
  await pb.getByRole("button", { name: "Show the effect" }).click();
  await expect(pb.getByRole("cell", { name: "Largest holding" })).toBeVisible();
  await expect(pb.getByText(/Volatility goes down/)).toBeVisible();
  await expect(pb.getByText(/partly reflect the extra £300.00/)).toBeVisible();
  await b.close();
});
