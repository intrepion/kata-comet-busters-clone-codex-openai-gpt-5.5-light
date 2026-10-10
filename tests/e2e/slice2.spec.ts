import { expect, test } from "@playwright/test";

test("proves scoring, recovery, and Wave progression in-browser", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MVP Hangar" })).toBeVisible();

  await page.evaluate(() => {
    window.__meteorBreakersTest?.loadScenario("single-large-shot");
    window.__meteorBreakersTest?.step({ fire: true }, 1 / 60);
    window.__meteorBreakersTest?.step({}, 0.12);
  });
  const scored = await page.evaluate(() => window.__meteorBreakersTest?.getSnapshot());
  expect(scored?.score).toBe(100);
  expect(scored?.riskChain.multiplier).toBe(1.25);

  await page.evaluate(() => {
    window.__meteorBreakersTest?.loadScenario("collision");
    window.__meteorBreakersTest?.step({}, 1 / 60);
  });
  const recovered = await page.evaluate(() => window.__meteorBreakersTest?.getSnapshot());
  expect(recovered?.lives).toBe(2);
  expect(recovered?.status).toBe("recovering");

  await page.evaluate(() => {
    window.__meteorBreakersTest?.loadScenario("clear-wave");
    window.__meteorBreakersTest?.step({}, 0.2);
  });
  const nextWave = await page.evaluate(() => window.__meteorBreakersTest?.getSnapshot());
  expect(nextWave?.wave).toBe(2);
  expect(nextWave?.comets.length).toBeGreaterThan(0);
  await expect(page.locator("#wave")).toContainText("Wave 2");
});
