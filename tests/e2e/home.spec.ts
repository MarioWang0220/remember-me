import { expect, test } from "@playwright/test";

test("homepage smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "New Project Template" })).toBeVisible();
});
