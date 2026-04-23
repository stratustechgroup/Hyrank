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

  test("/trust renders moderation log with real stat cards", async ({ page }) => {
    await page.goto("/trust");
    // Assert the distinctive stat-card labels render — not just any "trust" word.
    await expect(page.getByText("Shadow-invalidated votes").first()).toBeVisible();
    await expect(page.getByText("Servers demoted").first()).toBeVisible();
    await expect(page.getByText("Accounts flagged").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /This Week.s Moderation Activity/i })).toBeVisible();
  });
});
