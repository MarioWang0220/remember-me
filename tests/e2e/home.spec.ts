import { expect, test } from "@playwright/test";

test("timeline supports year click and story review", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "人生时间线" })).toBeVisible();

  await page.getByRole("button", { name: /1978年/ }).click();
  await expect(page.getByRole("heading", { name: "1978 年故事" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "第一次进城工作" })).toBeVisible();

  await page.getByRole("button", { name: /1985年/ }).click();
  await expect(page.getByRole("heading", { name: "1985 年故事" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "在乡镇办夜校" })).toBeVisible();
  await expect(page.getByText("故事年份: 1984-1986")).toBeVisible();
});
