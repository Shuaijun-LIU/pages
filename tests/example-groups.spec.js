import { test, expect } from "@playwright/test";

test("collection keeps the curated entries with requested removals and merges", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".example-card h3")).toHaveText([
    "FIELDWORK", "BRACE", "D-JEPA", "MimicX", "Robot Studio", "WARP-RM", "EgoMI / Real2Render2Real", "CaP-X", "Josephine’s World", "Synesthesia", "Pocket Grove", "Crater", "Inner Space", "Glance",
  ]);
  await expect(page.locator("[data-example-count]")).toHaveText("14");
  await page.getByRole("link", { name:"Open Robot Studio", exact:true }).click();
  await expect(page.getByRole("tab", { name:"G1", exact:true })).toHaveAttribute("aria-selected", "true");
  await expect(page.frameLocator("#example-frame").locator("#hero-stage")).toHaveAttribute("data-ready", "true");
});

test("robot tabs load real scenes, release inactive views, support deep links and back", async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion:"reduce" });
  const errors=[];
  page.on("pageerror", e=>errors.push(e.message));
  await page.goto("/examples/robot-studio/#trajectory");
  const child=page.frameLocator("#example-frame");
  await expect(child.locator("#trajectory-stage")).toHaveAttribute("data-ready","true");
  await expect(child.locator(".joint-row")).toHaveCount(7);
  await expect(child.locator("body > header")).toBeHidden();
  await page.getByRole("tab", { name:"Panda · Viser", exact:true }).click();
  await expect(page.locator("#example-frame")).toHaveAttribute("src", /viser-replay\/$/);
  const viser=child.frameLocator("#viser-viewer");
  await expect(viser.getByRole("button",{name:"Play playback",exact:true})).toBeVisible();
  await viser.getByRole("button", { name:"Show scene tree" }).click();
  await expect(viser.getByText("/panda", { exact:true })).toBeVisible();
  await expect(child.locator("#trajectory-stage")).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("tab", { name:"Panda · Trajectory", exact:true })).toHaveAttribute("aria-selected","true");
  await expect(child.locator("#trajectory-stage")).toHaveAttribute("data-ready","true");
  await page.reload();
  await expect(child.locator("#trajectory-stage")).toHaveAttribute("data-ready","true");
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("tab",{name:"G1",exact:true}).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name:"Panda · Viser",exact:true })).toHaveAttribute("aria-selected","true");
  expect(errors).toEqual([]);
});

test("combined research entry switches both original sites and link targets", async ({ page }) => {
  for (const url of ["https://egocentric-manipulation-interface.github.io/", "https://real2render2real.com/"]) {
    await page.route(url+"**", route=>route.fulfill({contentType:"text/html",body:"<h1>Project page</h1>"}));
  }
  await page.goto("/examples/egomi-r2r/");
  await expect(page.locator("#example-frame")).toHaveAttribute("src","https://egocentric-manipulation-interface.github.io/");
  await page.getByRole("tab",{name:"Real2Render2Real",exact:true}).click();
  await expect(page.locator("#example-frame")).toHaveAttribute("src","https://real2render2real.com/");
  await expect(page.locator("#open-view")).toHaveAttribute("href","https://real2render2real.com/");
  await page.reload();
  await expect(page.getByRole("tab",{name:"Real2Render2Real",exact:true})).toHaveAttribute("aria-selected","true");
  await page.goto("/examples/egomi/");
  await expect(page).toHaveURL(/egomi-r2r\/#egomi$/);
  await page.goto("/examples/real2render2real/");
  await expect(page).toHaveURL(/egomi-r2r\/#r2r$/);
});
