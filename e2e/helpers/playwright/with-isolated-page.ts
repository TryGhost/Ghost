import {Browser, BrowserContext, Page} from '@playwright/test';

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

