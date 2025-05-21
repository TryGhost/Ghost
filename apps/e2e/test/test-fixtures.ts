import { test as baseTest } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';
import { TwoFactorAuthPage } from './page-objects/TwoFactorAuthPage';
import { DashboardPage } from './page-objects/DashboardPage';
import { EmailServiceFactory } from './services/EmailServiceFactory';
import type { EmailService } from './services/EmailService';

// Define types for our custom fixtures
export type TestFixtures = {
  adminUser: { username?: string; password?: string };
  appUrls: { baseURL: string; adminURL: string };
  emailService: EmailService;
  emailContext: string;
  loginPage: LoginPage;
  twoFactorAuthPage: TwoFactorAuthPage;
  dashboardPage: DashboardPage;
};

// Extend the base Playwright test with our custom fixtures
export const test = baseTest.extend<TestFixtures>({
  // Fixture for admin credentials
  adminUser: async ({}, use) => {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    if (!username || !password) {
      console.warn('ADMIN_USERNAME or ADMIN_PASSWORD environment variables are not fully set. Some tests might fail.');
    }
    await use({ username, password });
  },

  // Fixture for application URLs
  appUrls: async ({}, use) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:2368'; // Sensible default for local
    const adminURL = `${baseURL}/ghost`;
    if (!process.env.BASE_URL) {
        console.warn(`BASE_URL not set, defaulting to ${baseURL}. Ensure this is correct for your test environment.`);
    }
    await use({ baseURL, adminURL });
  },

  // Fixture for EmailService
  emailService: async ({}, use) => {
    try {
      const service = EmailServiceFactory.createService();
      await use(service);
    } catch (error) {
      console.error("Failed to initialize EmailService fixture:", error);
      throw error; // Rethrow to fail tests if email service can't be set up
    }
  },

  // Fixture for EmailContext
  emailContext: async ({}, use) => {
    try {
      const context = EmailServiceFactory.getEmailContext();
      await use(context);
    } catch (error) {
        console.error("Failed to get EmailContext fixture:", error);
        throw error;
    }
  },

  // Fixture for LoginPage page object
  loginPage: async ({ page, appUrls, adminUser }, use) => {
    await use(new LoginPage(page, appUrls.adminURL, adminUser.username, adminUser.password));
  },

  // Fixture for TwoFactorAuthPage page object
  twoFactorAuthPage: async ({ page, emailService, emailContext }, use) => {
    await use(new TwoFactorAuthPage(page, emailService, emailContext));
  },

  // Fixture for DashboardPage page object
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from '@playwright/test';
