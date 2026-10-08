import { test, expect } from "@playwright/test";

for (const entry of ["robot-hero", "robot-trajectory"]) {
  test(`${entry}: scene loads, camera controls work, and mobile fits`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/examples/${entry}/`);
    const stage = page.locator(".stage");
    await expect(stage).toHaveAttribute("data-ready", "true");
    const canvas = stage.locator("canvas");
    await expect(canvas).toBeVisible();
    const before = await canvas.getAttribute("data-camera");
    await page.getByRole("button", { name: "Front", exact: true }).click();
    await expect
      .poll(() => canvas.getAttribute("data-camera"))
      .not.toBe(before);
    const front = await canvas.getAttribute("data-camera");
    await canvas.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => canvas.getAttribute("data-camera")).not.toBe(front);
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    const keyboardView = await canvas.getAttribute("data-camera");
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5, {
      steps: 6,
    });
    await page.mouse.up();
    await expect
      .poll(() => canvas.getAttribute("data-camera"))
      .not.toBe(keyboardView);
    for (const width of [360, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("hero: reduced motion, playback, tour and reset", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/examples/robot-hero/");
  const stage = page.locator("#hero-stage");
  await expect(stage).toHaveAttribute("data-ready", "true");
  await expect(stage).toHaveAttribute("data-time", "0.000");
  await page.getByRole("button", { name: "Play motion", exact: true }).click();
  await expect
    .poll(async () => Number(await stage.getAttribute("data-time")))
    .toBeGreaterThan(0.1);
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  const time = await stage.getAttribute("data-time");
  await page.waitForTimeout(200);
  await expect(stage).toHaveAttribute("data-time", time);
  await page.getByRole("button", { name: "Tour" }).click();
  await expect(page.locator("#tour")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reset view" }).click();
  await expect(stage).toHaveAttribute("data-time", "0.000");
  await expect(page.locator("#tour")).toHaveAttribute("aria-pressed", "false");
});

test("trajectory: scrub changes FK, speed, playback and trail visibility", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/examples/robot-trajectory/");
  const stage = page.locator("#trajectory-stage");
  await expect(stage).toHaveAttribute("data-ready", "true");
  const initialTCP = await stage.getAttribute("data-tcp");
  await page.locator("#timeline").fill("6");
  await expect(stage).toHaveAttribute("data-time", "6.000");
  expect(await stage.getAttribute("data-tcp")).not.toBe(initialTCP);
  await expect(page.locator("#time-display")).toHaveText("6.00 / 12.00 s");
  await page.locator("#speed").selectOption("2");
  await page
    .getByRole("button", { name: "Play playback", exact: true })
    .click();
  await expect
    .poll(async () => Number(await stage.getAttribute("data-time")))
    .toBeGreaterThan(6.2);
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  const time = await stage.getAttribute("data-time");
  await page.waitForTimeout(200);
  await expect(stage).toHaveAttribute("data-time", time);
  await page.getByLabel("Show tool path").uncheck();
  await expect(stage).toHaveAttribute("data-trail", "false");
  await page.getByRole("button", { name: "Reset playback" }).click();
  await expect(stage).toHaveAttribute("data-time", "0.000");
  await expect(stage).toHaveAttribute("data-tcp", initialTCP);
});
