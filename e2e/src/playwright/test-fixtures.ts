import {test as baseTest} from '@playwright/test';
import {LoginPage} from './pages/LoginPage';
import {TwoFactorAuthPage} from './pages/TwoFactorAuthPage';
import {DashboardPage} from './pages/DashboardPage';
import {EmailServiceFactory} from '../services/email/EmailServiceFactory';
import type {IEmailService} from '../services/email/IEmailService';
import {resetDb} from '../database';
import Errors from '@tryghost/errors';

// Define types for our custom fixtures
export type TestFixtures = {
  adminUser: { username?: string; password?: string };
  appUrls: { baseURL: string; adminURL: string };
  emailService: IEmailService;
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
            throw new Errors.IncorrectUsageError({
                message: 'ADMIN_USERNAME or ADMIN_PASSWORD environment variables are not set.'
            });
        }
        await use({username, password});
    },

    // Fixture for application URLs
    appUrls: async ({}, use) => {
        const baseURL = process.env.BASE_URL || 'http://localhost:2368'; // Sensible default for local
        const adminURL = `${baseURL}/ghost`;
        if (!process.env.BASE_URL) {
            throw new Errors.IncorrectUsageError({
                message: 'BASE_URL environment variable is not set. Please set it to the base URL of your Ghost instance.'
            });
        }
        await use({baseURL, adminURL});
    },

    // Fixture for EmailService
    emailService: async ({}, use) => {
        try {
            const service = EmailServiceFactory.createService();
            await use(service);
        } catch (err) {
            throw new Errors.IncorrectUsageError({
                message: 'Failed to initialize EmailService fixture.'
            });
        }
    },

    // Fixture for EmailContext
    emailContext: async ({}, use) => {
        try {
            const context = EmailServiceFactory.getEmailContext();
            await use(context);
        } catch (err) {
            throw new Errors.IncorrectUsageError({
                message: 'Failed to get EmailContext fixture.'
            });
        }
    },

    // Fixture for LoginPage page object
    loginPage: async ({page, appUrls, adminUser}, use) => {
        await use(new LoginPage(page, appUrls.adminURL, adminUser.username, adminUser.password));
    },

    // Fixture for TwoFactorAuthPage page object
    twoFactorAuthPage: async ({page, emailService, emailContext}, use) => {
        await use(new TwoFactorAuthPage(page, emailService, emailContext));
    },

    // Fixture for DashboardPage page object
    dashboardPage: async ({page}, use) => {
        await use(new DashboardPage(page));
    }
});

// Global beforeEach hook to reset database sessions before each test
test.beforeEach(async () => {
    await resetDb();
});

export {expect} from '@playwright/test';
