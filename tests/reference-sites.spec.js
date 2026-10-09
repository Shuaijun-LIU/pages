import { test, expect } from "@playwright/test";
import { referenceSites } from "../src/reference-sites.js";

for (const site of referenceSites) {
  test(`${site.name} reference entry keeps original URL and return route`, async ({
    page,
  }) => {
    // CI verifies our shell; original sites are independently audited and not controlled by this repository.
    await page.route(site.url + "**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<h1>Original project website</h1>",
      }),
    );
    await page.goto(`/examples/${site.slug}/`);
    await expect(page.locator("#reference-name")).toHaveText(site.name);
    await expect(page.locator("#reference-frame")).toHaveAttribute(
      "src",
      site.url,
    );
    await expect(page.locator("#original-link")).toHaveAttribute(
      "href",
      site.url,
    );
    await expect(
      page.frameLocator("#reference-frame").getByRole("heading"),
    ).toHaveText("Original project website");
    await expect(page.locator("#reference-frame")).toHaveAttribute("allow", ["fullscreen", ...(site.permissions || [])].join("; "));
    await page.reload();
    await expect(page.locator("#reference-name")).toHaveText(site.name);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: "← Collection" }).click();
    await expect(page.locator("#example-list article")).toHaveCount(11);
  });
}

test("all new collection previews load and language switch retains routes", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.locator(".example-card");
  await expect(cards).toHaveCount(11);
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        card
          .locator("img")
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);
  }
  const routes = await page
    .locator(".enter-link")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  await page.getByRole("button", { name: "中文", exact: true }).click();
  expect(
    await page
      .locator(".enter-link")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
  ).toEqual(routes);
  await expect(page.locator(".tags").last()).toContainText("摄像头手势");
});
