import { expect, test } from "@playwright/test";

test("a new learner onboards, gets a plan and completes a lesson", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Start learning/ }).click();
  await page.getByLabel("What should we call you?").fill("Sam");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /None at all/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: /home deposit/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Skip the remaining profile questions.
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.getByText("A quick knowledge check")).toBeVisible();
  await page.getByRole("radio", { name: "A small part of the company" }).check();
  await page.getByRole("radio", { name: "£1,210" }).check();
  await page.getByRole("button", { name: "See my plan" }).click();
  await expect(page.getByText("Your starting plan")).toBeVisible();
  await expect(page.getByText("Shares and ownership: known")).toBeVisible();
  await expect(page.getByText("Diversification: to learn")).toBeVisible();
  await page.getByRole("button", { name: "Go to my dashboard" }).click();

  await expect(page.getByRole("heading", { name: /, Sam$/ })).toBeVisible();
  await expect(page.locator("[data-slot=card]").filter({ hasText: "Next lesson" }).getByText("What investing is, and why people do it")).toBeVisible();
  await page.getByRole("link", { name: /Start lesson/ }).click();

  await expect(page.getByRole("heading", { level: 1, name: "What investing is, and why people do it" })).toBeVisible();
  // In-lesson check
  await page.getByRole("radio", { name: /Being able to spend it now/ }).check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("That's the trade")).toBeVisible();
  // Quiz: answer one wrong first to see revisit suggestions
  await page.getByRole("radio", { name: "30%" }).check();
  await page.getByRole("radio", { name: "Buying a share in a company" }).check();
  await page.getByRole("radio", { name: /averaged about 7% a year/ }).check();
  await page.getByRole("button", { name: "Fairly sure" }).click();
  await page.getByRole("button", { name: "Check my answers" }).click();
  await expect(page.getByText("2 of 3 correct")).toBeVisible();
  await expect(page.getByText("Lesson complete.")).toBeVisible();
  await expect(page.getByText("Worth revisiting")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Returns and losses in percentages" }).first()).toBeVisible();

  // Progress survives a reload (guest data in localStorage)
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /What investing is.*Done/ })).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByText("Lessons completed")).toBeVisible();
  await expect(page.locator("text=Quizzes taken").locator("..")).toContainText("1");

  await page.goto("/dashboard");
  await expect(page.getByText("Saving versus investing")).toBeVisible();
});

test("a lesson calculator shows its working", async ({ page }) => {
  await page.goto("/learn/compound-growth");
  const years = page.getByLabel("Years", { exact: true });
  await years.fill("20");
  await page.getByLabel(/Added each month/).fill("0");
  await expect(page.getByText(/worth\s+£2,6\d\d\.\d\d/)).toBeVisible();
  await expect(page.getByText("Hypothetical.").first()).toBeVisible();
});
