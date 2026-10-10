import { expect, test } from "@playwright/test";

test("uses the MVP Hangar and persists the Local Record", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator("#status")).toContainText("Playing");

  await page.evaluate(() => {
    window.__meteorBreakersTest?.loadScenario("single-large-shot");
    window.__meteorBreakersTest?.step({ fire: true }, 1 / 60);
    window.__meteorBreakersTest?.step({}, 0.12);
  });
  await expect(page.locator("#record")).toContainText("Best 100 pts");

  await page.getByRole("button", { name: "Mute" }).click();
  await expect(page.getByRole("button", { name: "Unmute" })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.locator("#record")).toContainText("Best 100 pts");
  await expect(page.getByRole("button", { name: "Unmute" })).toHaveAttribute("aria-pressed", "true");
});
