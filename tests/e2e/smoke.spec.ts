import { test, expect } from "@playwright/test";

test.describe("hyrank smoke", () => {
  test("landing page renders", async ({ page }) => {
    await page.goto("/");
    // Expect some recognizable content (brand name).
    await expect(page.locator("body")).toContainText(/hyrank/i);
  });

  test("/login page loads without error", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(500);
  });

  test("/rankings page loads without error", async ({ page }) => {
    const response = await page.goto("/rankings");
    expect(response?.status()).toBeLessThan(500);
  });

  test("/robots.txt includes /admin/ disallow", async ({ page }) => {
    await page.goto("/robots.txt");
    await expect(page.locator("body")).toContainText("/admin/");
  });

  test("/trust renders moderation log", async ({ page }) => {
    await page.goto("/trust");
    await expect(page.locator("body")).toContainText(/moderation|shadow.invalidated|trust/i);
  });
});
