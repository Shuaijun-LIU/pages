import { test, expect } from "@playwright/test";

test("collection opens its first example and provides a return route", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /项目网站\s*参考集锦/ }),
  ).toBeVisible();
  await expect(page.locator("[data-example-count]").first()).toHaveText("01");
  const preview = page.getByRole("img", { name: /FIELDWORK/ });
  await expect(preview).toBeVisible();
  expect(
    await preview.evaluate((image) => image.complete && image.naturalWidth > 0),
  ).toBe(true);
  expect(requests.some((url) => url.endsWith(".glb"))).toBe(false);
  await page.getByRole("link", { name: "进入示例" }).click();
  await expect(page).toHaveURL(/\/examples\/fieldwork\/$/);
  await expect(page.locator("#motion-canvas")).toHaveAttribute(
    "data-assets",
    "ready",
  );
  await page.getByRole("link", { name: "返回集锦" }).click();
  await expect(
    page.getByRole("heading", { name: /项目网站\s*参考集锦/ }),
  ).toBeVisible();
});

test("nested example supports direct loading, refresh, and license links", async ({
  page,
}) => {
  await page.goto("/examples/fieldwork/");
  await expect(page.locator("#motion-canvas")).toHaveAttribute(
    "data-assets",
    "ready",
  );
  await page.reload();
  await expect(page.locator("#motion-canvas")).toHaveAttribute(
    "data-assets",
    "ready",
  );
  await page.getByRole("button", { name: "Credits", exact: true }).click();
  const url = await page
    .getByRole("link", { name: "Robot model license" })
    .evaluate((link) => link.href);
  const response = await page.request.get(url);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("Redistribution");
});

test("collection remains usable on narrow screens and with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("link", { name: "进入示例" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
