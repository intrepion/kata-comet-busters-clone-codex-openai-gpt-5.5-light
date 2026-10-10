import { expect, test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

test("launches the root Direct-File artifact", async ({ page }) => {
  const url = pathToFileURL(resolve(process.cwd(), "index.html")).toString();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto(url);
  await expect(page.getByRole("heading", { name: "MVP Hangar" })).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator("#status")).toContainText("Playing");

  const snapshot = await page.evaluate(() => window.__meteorBreakersTest?.getSnapshot());
  expect(snapshot?.comets.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
