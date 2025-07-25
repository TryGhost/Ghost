import {Page} from '@playwright/test';
import {PostsPage, LoginPage, AnalyticsOverviewPage} from './pages/admin';

/**
 * Navigation helpers that create page objects and navigate in one step
 * These return the page object so you can chain methods if needed
 */

// Posts navigation
export async function gotoPosts(page: Page): Promise<PostsPage> {
    const postsPage = new PostsPage(page);
    await postsPage.goto();
    return postsPage;
}

// Login navigation
export async function gotoLogin(page: Page): Promise<LoginPage> {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    return loginPage;
}

// Analytics navigation
export async function gotoAnalytics(page: Page): Promise<AnalyticsOverviewPage> {
    const analyticsPage = new AnalyticsOverviewPage(page);
    await analyticsPage.goto();
    return analyticsPage;
}

/**
 * Generic navigation helper for any admin page
 * Usage: await gotoAdminPage(page, '/ghost/#/settings')
 */
export async function gotoAdminPage(page: Page, path: string): Promise<void> {
    const baseUrl = page.url().split('/ghost/')[0];
    await page.goto(`${baseUrl}${path}`);
    await page.waitForLoadState('networkidle');
}

/**
 * Navigation shortcuts that don't return page objects
 * For when you just want to navigate and don't need the page object
 */
export const goto = {
    posts: async (page: Page) => {
        await gotoAdminPage(page, '/ghost/#/posts');
    },
    
    pages: async (page: Page) => {
        await gotoAdminPage(page, '/ghost/#/pages');
    },
    
    members: async (page: Page) => {
        await gotoAdminPage(page, '/ghost/#/members');
    },
    
    settings: async (page: Page) => {
        await gotoAdminPage(page, '/ghost/#/settings');
    },
    
    login: async (page: Page) => {
        await gotoAdminPage(page, '/ghost/#/signin');
    },
    
    dashboard: async (page: Page) => {
        await gotoAdminPage(page, '/ghost/#/dashboard');
    },
    
    editor: {
        newPost: async (page: Page) => {
            await gotoAdminPage(page, '/ghost/#/editor/post');
        },
        
        newPage: async (page: Page) => {
            await gotoAdminPage(page, '/ghost/#/editor/page');
        }
    },
    
    analytics: {
        overview: async (page: Page) => {
            await gotoAdminPage(page, '/ghost/#/analytics');
        },
        
        growth: async (page: Page) => {
            await gotoAdminPage(page, '/ghost/#/analytics/growth');
        },
        
        locations: async (page: Page) => {
            await gotoAdminPage(page, '/ghost/#/analytics/locations');
        },
        
        webTraffic: async (page: Page) => {
            await gotoAdminPage(page, '/ghost/#/analytics/web-traffic');
        }
    }
};