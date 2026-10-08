import { test, expect } from "@playwright/test";

test("live scene renders, pauses, resumes, and changes experiments", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const canvas = page.locator("#motion-canvas");
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  await expect(canvas).toHaveAttribute("data-assets", "ready");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-time")))
    .toBeGreaterThan(0.2);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.waitForTimeout(150);
  const time = await canvas.getAttribute("data-time");
  await page.waitForTimeout(250);
  await expect(canvas).toHaveAttribute("data-time", time);
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-time")))
    .toBeGreaterThan(Number(time));
  await page.getByRole("button", { name: "Transfer", exact: true }).click();
  await expect(page.locator("#experiment-count")).toHaveText("02 / 04");
  await expect(page.locator("#typed-text")).toHaveText(
    "Two hands. One continuous conversation.",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator("#experiment-count")).toHaveText("04 / 04");
  await page.getByRole("button", { name: "POINTS", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "POINTS", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("orbit and reset visibly change the scene while paused", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator("#motion-canvas");
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  await expect(canvas).toHaveAttribute("data-assets", "ready");
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.waitForTimeout(100);
  const before = await canvas.evaluate((el) => el.toDataURL());
  await page.locator("#scene").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  expect(await canvas.evaluate((el) => el.toDataURL())).not.toBe(before);
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.waitForTimeout(100);
  expect(await canvas.evaluate((el) => el.toDataURL())).toBe(before);
});

test("theme persists and notebook opens and closes accessibly", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveCSS("color", "rgb(221, 221, 229)");
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(10, 10, 12)",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /Field notes/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "04 / Run" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: /Field notes/ })).toBeFocused();
});

test("mobile and tablet stay within viewport and controls work", async ({
  page,
}) => {
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator("#motion-canvas")).toHaveAttribute(
      "data-renderer",
      "webgl",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.locator("#experiment-count")).toHaveText("04 / 04");
  }
});

test("reduced motion starts still with complete text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Play animation", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#typed-text")).toHaveText(
    "Reach further. Bring a possibility closer.",
  );
  const canvas = page.locator("#motion-canvas");
  await expect(canvas).toHaveAttribute("data-time", "0.000");
  await page.waitForTimeout(200);
  await expect(canvas).toHaveAttribute("data-time", "0.000");
});

test("WebGL-unavailable browsers get a working Canvas fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl")
        ? null
        : original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator("#motion-canvas")).toHaveAttribute(
    "data-renderer",
    "canvas",
  );
  await expect
    .poll(async () =>
      Number(await page.locator("#motion-canvas").getAttribute("data-time")),
    )
    .toBeGreaterThan(0.1);
});

test("subtitle is available to screen readers", async ({ page }) => {
  await page.goto("/");
  expect(await page.locator(".typed-line").ariaSnapshot()).toContain(
    "Reach further. Bring a possibility closer.",
  );
  await page.getByRole("button", { name: "Transfer", exact: true }).click();
  await expect(page.locator("#motion-canvas")).toHaveAttribute(
    "data-scene",
    "transfer",
  );
  expect(await page.locator(".typed-line").ariaSnapshot()).toContain(
    "Two hands. One continuous conversation.",
  );
});

test("WebGL recovers correct dimensions after context loss and resize", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      const context = original.call(this, type, ...args);
      if (type === "webgl2" && context) window.testGL = context;
      return context;
    };
  });
  await page.goto("/");
  const canvas = page.locator("#motion-canvas");
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  await expect(canvas).toHaveAttribute("data-assets", "ready");
  await page.evaluate(() => {
    window.testLoss = window.testGL.getExtension("WEBGL_lose_context");
    window.testLoss.loseContext();
  });
  await expect(canvas).toHaveAttribute("data-renderer", "canvas");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await page.evaluate(() => window.testLoss.restoreContext());
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  await expect(canvas).toHaveAttribute("data-assets", "ready");
  const ratios = await page.evaluate(() => {
    const bounds = document.querySelector("#scene").getBoundingClientRect();
    return {
      buffer:
        window.testGL.drawingBufferWidth / window.testGL.drawingBufferHeight,
      view: bounds.width / bounds.height,
    };
  });
  expect(Math.abs(ratios.buffer - ratios.view)).toBeLessThan(0.02);
});
