import { expect, test } from "@playwright/test";

for (const path of ["/", "/dashboard", "/learn", "/learn/compound-growth", "/portfolio", "/portfolio/sandbox", "/tutor", "/progress", "/settings", "/privacy"]) {
  test(`no horizontal scrolling on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
