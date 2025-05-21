import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly dashboardTitle: Locator; // A prominent, stable element on the dashboard
  // Add other key dashboard elements here as needed for future tests

  constructor(page: Page) {
    this.page = page;
    // Assuming a main heading with "Dashboard" is present.
    // Adjust this selector if needed to a more stable/unique element on your dashboard.
    this.dashboardTitle = page.getByRole('heading', { name: 'Dashboard', exact: true });
    // Example of a more specific selector if the above is too generic:
    // this.dashboardTitle = page.locator('h1.gh-main-title:has-text("Dashboard")');
  }

  async expectVisible(timeout: number = 15000) {
    // This method now primarily focuses on element visibility as a sign the page content has loaded.
    await expect(this.dashboardTitle).toBeVisible({ timeout });
    console.log('Dashboard title is visible. Dashboard appears loaded.');
  }

  async expectCurrentUrl(timeout: number = 10000) {
    // Asserts the URL path ends with /ghost/#/dashboard or /#/dashboard
    await expect(this.page).toHaveURL(/\/ghost\/#\/dashboard$|\/#\/dashboard$/, { timeout });
    console.log('Dashboard URL is correct.');
  }

  // Example of a combined assertion if often used together, but keeping them separate for now as requested.
  // async expectLoaded(timeout: number = 15000) {
  //   await this.expectCorrectUrl(timeout);
  //   await this.expectVisible(timeout);
  // }

  // Add other methods for interacting with the dashboard here, e.g.:
  // async navigateToPosts() { ... }
  // async openSettings() { ... }
}
