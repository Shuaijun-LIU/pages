import { test, expect } from "@playwright/test";

test("Viser recording loads locally, pauses, scrubs, and orbits", async ({ page }) => {
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (/^https?:/.test(request.url()) && !request.isNavigationRequest() && new URL(request.url()).origin !== new URL(page.url()).origin) externalRequests.push(request.url());
  });
  await page.goto("examples/viser-replay/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Motion, fromevery angle.");
  const viewer = page.frameLocator("#viser-viewer");
  const time = viewer.getByRole("textbox", { name: "Playback time in seconds" });
  await expect(time).toBeVisible();
  await viewer.getByRole("button", { name: "Pause playback" }).click();
  const paused = await time.inputValue();
  await page.waitForTimeout(200);
  await expect(time).toHaveValue(paused);
  const timeline = viewer.locator(".mantine-Slider-trackContainer");
  const timelineBounds = await timeline.boundingBox();
  await timeline.click({ position: { x: timelineBounds.width * .75, y: timelineBounds.height / 2 } });
  await expect.poll(async () => Math.abs(Number(await time.inputValue()) - 9)).toBeLessThan(.5);
  await time.fill("5.0");
  await time.press("Enter");
  await expect(time).toHaveValue("5.0");
  await expect(viewer.getByRole("button", { name: "Play playback" })).toBeVisible();
  const notificationClose = viewer.locator(".mantine-Notification-closeButton");
  if (await notificationClose.count()) await notificationClose.click();
  const canvas = viewer.locator("canvas").first();
  await expect(canvas).toBeVisible();
  const before = await canvas.screenshot();
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * .55, bounds.y + bounds.height * .45);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .6, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = await canvas.screenshot();
  expect(before.equals(after)).toBe(false);
  await viewer.getByRole("button", { name: "Play playback" }).click();
  await expect.poll(() => time.inputValue()).not.toBe("5.0");
  await viewer.getByRole("button", { name: "Show scene tree" }).click();
  await expect(viewer.locator("[data-playback-scene-tree]")).toBeVisible();
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test("Viser source recording is downloadable and the page fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("examples/viser-replay/");
  await expect(page.frameLocator("#viser-viewer").getByRole("textbox", { name: "Playback time in seconds" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download .viser" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("pick-place.viser");
  expect(await download.failure()).toBeNull();
  await expect(page.getByText("Prerecorded kinematic motion", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Collection", exact: true })).toHaveAttribute("href", "../../");
});

test("Viser respects reduced motion initially and still allows deliberate playback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("examples/viser-replay/");
  const viewer = page.frameLocator("#viser-viewer");
  const time = viewer.getByRole("textbox", { name: "Playback time in seconds" });
  await expect(viewer.getByRole("button", { name: "Play playback" })).toBeVisible();
  const paused = await time.inputValue();
  await page.waitForTimeout(250);
  await expect(time).toHaveValue(paused);
  await viewer.getByRole("button", { name: "Play playback" }).click();
  await expect(viewer.getByRole("button", { name: "Pause playback" })).toBeVisible();
  await expect.poll(() => time.inputValue()).not.toBe(paused);
});
