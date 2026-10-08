import { test, expect } from "@playwright/test";

test("four distinct animated subjects are selectable", async ({ page }) => {
  await page.goto("/examples/fieldwork/");
  const canvas = page.locator("#motion-canvas");
  await expect(
    page.getByRole("button", { name: "Harvest", exact: true }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-assets", "ready");
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const views = [];
  for (const [label, scene] of [
    ["Harvest", "harvest"],
    ["Transfer", "transfer"],
    ["Fold", "fold"],
    ["Run", "run"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(canvas).toHaveAttribute("data-scene", scene);
    await expect(canvas).toHaveAttribute("data-transition", "steady");
    views.push(await canvas.evaluate((el) => el.toDataURL()));
  }
  expect(new Set(views).size).toBe(4);
});

test("autoplay advances subjects and can be disabled", async ({ page }) => {
  await page.goto("/examples/fieldwork/");
  const canvas = page.locator("#motion-canvas");
  await expect(canvas).toHaveAttribute("data-assets", "ready");
  await expect(canvas).toHaveAttribute("data-scene", "harvest");
  await expect(canvas).toHaveAttribute("data-scene", "transfer", {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "Disable automatic scene switching" })
    .click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-scene", "run");
  await expect(
    page.getByRole("button", { name: "Enable automatic scene switching" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("new reduced-motion preference survives closing a dialog", async ({
  page,
}) => {
  await page.goto("/examples/fieldwork/");
  await expect(page.locator("#motion-canvas")).toHaveAttribute(
    "data-assets",
    "ready",
  );
  await page.getByRole("button", { name: /Field notes/ }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Play animation", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Play animation", exact: true }),
  ).toBeVisible();
  const time = await page.locator("#motion-canvas").getAttribute("data-time");
  await page.waitForTimeout(200);
  await expect(page.locator("#motion-canvas")).toHaveAttribute(
    "data-time",
    time,
  );
});

test("missing model preserves scene selection and 2D view controls", async ({
  page,
}) => {
  await page.route("**/models/humanoid.glb", (route) => route.abort());
  await page.goto("/examples/fieldwork/");
  const canvas = page.locator("#motion-canvas");
  await expect(canvas).toHaveAttribute("data-assets", "fallback");
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.getByRole("button", { name: "Fold", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-scene", "fold");
  const before = await canvas.evaluate((el) => el.toDataURL());
  await page.locator("#scene").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("+");
  await expect
    .poll(() => canvas.evaluate((el) => el.toDataURL()))
    .not.toBe(before);
  await page.getByRole("button", { name: "Reset view" }).click();
  await expect.poll(() => canvas.evaluate((el) => el.toDataURL())).toBe(before);
});
