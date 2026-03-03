import { expect, test } from "@playwright/test";

test("homepage smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Remember Me 语音回忆室" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始语音会话" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始语音输入" })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
