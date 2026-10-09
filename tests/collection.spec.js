import { test, expect } from "@playwright/test";

// English is the initial language even when the browser prefers Chinese.
test.use({ locale: "zh-CN" });

test("collection opens its first example and provides a return route", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Website\s*collection/ }),
  ).toBeVisible();
  await expect(page.locator("[data-example-count]").first()).toHaveText("11");
  const preview = page.getByRole("img", { name: /FIELDWORK/ });
  await expect(preview).toBeVisible();
  expect(
    await preview.evaluate((image) => image.complete && image.naturalWidth > 0),
  ).toBe(true);
  expect(requests.some((url) => url.endsWith(".glb"))).toBe(false);
  await page
    .getByRole("link", { name: "Open website", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/examples\/fieldwork\/$/);
  await expect(page.locator("#motion-canvas")).toHaveAttribute(
    "data-assets",
    "ready",
  );
  await page.getByRole("link", { name: "返回集锦" }).click();
  await expect(
    page.getByRole("heading", { name: /Website\s*collection/ }),
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
    await expect(
      page.getByRole("link", { name: "Open website", exact: true }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("language switching translates the collection and preserves the choice", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("button", { name: "English", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const routes = await page
    .locator(".enter-link")
    .evaluateAll((links) => links.map((link) => link.href));
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page).toHaveTitle("项目网站参考集锦 — Shuaijun");
  await expect(
    page.getByRole("heading", { name: /项目网站\s*参考集锦/ }),
  ).toBeVisible();
  await expect(page.locator(".tags").first()).toContainText("运动拖尾");
  await expect(page.locator(".intro-description")).toHaveText(
    "收录项目网站与交互演示，供后续设计参考。",
  );
  await expect(
    page.getByRole("button", { name: "中文", exact: true }),
  ).toBeFocused();
  expect(
    await page
      .locator(".enter-link")
      .evaluateAll((links) => links.map((link) => link.href)),
  ).toEqual(routes);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await page
    .getByRole("link", { name: "进入示例", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "返回集锦" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page).toHaveTitle("Website collection — Shuaijun");
  await expect(page.locator(".tags").first()).toContainText("Motion trails");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#example-list article")).toHaveCount(11);
  expect(await page.locator('a[href^="https://"]').count()).toBe(0);
});

test("language selection works when browser storage is unavailable", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage disabled", "SecurityError");
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "进入示例", exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open website", exact: true }).first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
