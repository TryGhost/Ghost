import {APIRequestContext, Browser, BrowserContext, Page} from '@playwright/test';

export async function withIsolatedPage<T>(
    browser: Browser,
    opts: Parameters<Browser['newContext']>[0],
    run: ({page, context}: {page: Page, context: BrowserContext}) => Promise<T>
): Promise<T> {
    const context = await browser.newContext(opts);
    const page = await context.newPage();
    try {
        return await run({page, context});
    } finally {
        await page.close();
        await context.close();
    }
}

/**
 * Playwright has its HTTP client abstraction - page.request. It auto-stores cookies, headers and other states as
 *
 * This function returns the page.request object, so you can use it to make requests to the Ghost backend without worrying
 * about things like cookies, headers (authentication), since they are already pre-set up for you in this HTTP client.
 *
 * @param page
 */
export function getHttpClient(page: Page): APIRequestContext {
    return page.request;
}

