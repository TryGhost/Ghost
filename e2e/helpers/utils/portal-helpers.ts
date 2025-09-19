import {Page} from '@playwright/test';

/**
 * Wait for the Portal script to be loaded on the page
 */
export async function waitForPortalScript(page: Page): Promise<void> {
    // Wait for the Portal script tag to be present in the DOM
    await page.waitForSelector('script[data-ghost][data-key][data-api]', {
        state: 'attached',
        timeout: 10000
    });
    
    // Give Portal time to initialize
    await page.waitForTimeout(500);
}

/**
 * Open Portal by clicking the Subscribe button on the Ghost frontend
 */
export async function openPortalViaSubscribeButton(page: Page): Promise<void> {
    // Ensure Portal script is loaded first
    await waitForPortalScript(page);
    
    // Click the Subscribe link in the header (not the button in the form)
    // This opens the Portal iframe
    const subscribeLink = page.locator('a[href="#/portal/signup"]').first();
    await subscribeLink.click();
    
    // Wait for Portal iframe to appear using title attribute
    await page.waitForSelector('iframe[title="portal-popup"]', {
        state: 'visible',
        timeout: 5000
    });
}