import { expect, test } from "@playwright/test";

test("records First Victory after the Core Comet milestone", async ({ page }) => {
  await page.goto("/app.html");

  await page.evaluate(() => {
    window.localStorage.clear();
    window.__meteorBreakersTest?.loadScenario("core-comet");
  });
  for (let i = 0; i < 30; i += 1) {
    const wave = await page.evaluate(() => window.__meteorBreakersTest?.getSnapshot().wave);
    if (wave && wave > 8) {
      break;
    }
    await page.evaluate(() => window.__meteorBreakersTest?.fireAtThreat(0));
  }

  await expect(page.locator("#victory")).toContainText("First Victory complete");
  const snapshot = await page.evaluate(() => window.__meteorBreakersTest?.getSnapshot());
  expect(snapshot?.wave).toBeGreaterThan(8);
});

test("charges and activates Overdrive from browser scenarios", async ({ page }) => {
  await page.goto("/app.html");

  await page.evaluate(() => {
    window.__meteorBreakersTest?.loadScenario("near-miss");
    window.__meteorBreakersTest?.step({}, 1 / 60);
  });
  await expect(page.locator("#overdrive")).toContainText("Overdrive 10%");

  await page.evaluate(() => {
    window.__meteorBreakersTest?.loadScenario("overdrive-ready");
    window.__meteorBreakersTest?.step({ overdrive: true }, 1 / 60);
    window.__meteorBreakersTest?.step({ fire: true }, 1 / 60);
  });
  await expect(page.locator("#overdrive")).toContainText("Overdrive active");
});
