import { test, expect } from "@playwright/test";

for (const [slug, name, title] of [
  ["brace", "BRACE", /When Replanning Becomes the Bottleneck/],
  ["d-jepa", "D-JEPA", /D-JEPA: A Decision-Aligned/],
  ["mimicx", "MimicX", /MimicX.*Policy-in-the-Loop/],
]) {
  test(`${name} opens from the collection and works on mobile`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (
        response.url().includes(`/examples/${slug}/`) &&
        response.status() >= 400
      )
        errors.push(response.url());
    });
    await page.goto("/");
    const card = page.getByRole("article", { name, exact: true });
    await card.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        card
          .locator("img")
          .evaluate((image) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
    await card.getByRole("link", { name: "Open website", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/examples/${slug}/$`));
    await expect(page).toHaveTitle(title);
    await expect(page.getByRole("link", { name: "返回集锦" })).toBeVisible();
    await page.reload();
    await expect(page).toHaveTitle(title);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: "返回集锦" }).click();
    await expect(page.locator("#example-list article")).toHaveCount(14);
    expect(errors).toEqual([]);
  });
}

test("BRACE keeps its nested interactive explainer", async ({ page }) => {
  await page.goto("/examples/brace/");
  await page
    .getByRole("link", { name: "Open the BRACE interactive animation" })
    .click();
  await expect(page).toHaveURL(/\/examples\/brace\/animation\/$/);
  await page.getByRole("button", { name: "Go to Budget", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Go to Budget", exact: true }),
  ).toHaveClass(/active/);
  await page.getByRole("link", { name: "返回集锦" }).click();
  await expect(page.locator("#example-list article")).toHaveCount(14);
});

test("D-JEPA keeps its dynamic method diagram and narration assets", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/examples/d-jepa/");
  await page.locator("#interactive-explainer").click();
  await expect(page).toHaveURL(/\/examples\/d-jepa\/explainer.html$/);
  await page.locator('button[data-stage="2"]').click();
  await expect(page.locator('button[data-stage="2"]')).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.locator("#detail-visual")).toBeVisible();
  await expect
    .poll(() =>
      page.locator("#detail-visual").evaluate((svg) => svg.children.length),
    )
    .toBeGreaterThan(0);
  const manifestResponse = await page.request.get(
    "/examples/d-jepa/static/data/explainer-narration.json",
  );
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  const audio = await page.request.head(
    `/examples/d-jepa/${manifest.segments[0].audio}`,
  );
  expect(audio.ok()).toBe(true);
  expect(errors).toEqual([]);
});

test("MimicX keeps carousel, image viewer, and video task switching", async ({
  page,
}) => {
  await page.goto("/examples/mimicx/");
  await page
    .getByRole("button", { name: "Pause showcase", exact: true })
    .click();
  await page.getByRole("button", { name: "Next image", exact: true }).click();
  await expect(page.locator("#showcase-count")).toHaveText("02 / 08");
  await page.locator("#showcase-slides figure").nth(1).locator("a").click();
  await expect(page.locator("#media-viewer")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#media-viewer")).not.toBeVisible();
  await page
    .getByRole("tab", { name: "Football Juggling", exact: true })
    .click();
  await expect(page.locator("#ours-video")).toHaveAttribute(
    "src",
    /football-ours.mp4$/,
  );
  const response = await page.request.head(
    "/examples/mimicx/assets/media/football-ours.mp4",
  );
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("video/mp4");
});
