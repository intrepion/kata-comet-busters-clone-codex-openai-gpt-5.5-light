import { expect, test } from "@playwright/test";

test("plays the Slice 1 flight and fragmentation loop in-browser", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MVP Hangar" })).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.locator("#game").click();
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowUp");

  const moved = await page.evaluate(() => window.__meteorBreakersTest?.getSnapshot());
  expect(moved?.skimmer.velocity.y).toBeLessThan(0);

  await page.evaluate(() => {
    window.__meteorBreakersTest?.reset();
    for (let i = 0; i < 5; i += 1) {
      window.__meteorBreakersTest?.step({ fire: true }, 1 / 60);
    }
  });

  const snapshot = await page.evaluate(() => window.__meteorBreakersTest?.getSnapshot());
  expect(snapshot?.shots.length).toBeGreaterThan(0);
  expect(snapshot?.comets.length).toBe(2);
  await expect(page.locator("#score")).toContainText("0 pts");
});
