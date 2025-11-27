import * as fs from 'fs';
import * as path from 'path';
import {Browser, BrowserContext} from '@playwright/test';

/**
 * Base URL used by Playwright for all test contexts. Requests to this hostname
 * are routed to the actual Ghost backend instance (localhost:{port}) via route interception.
 */
export const PLAYWRIGHT_BASE_URL = 'http://ghost.test:2368';

const AUTH_STATE_DIR = path.join(process.cwd(), 'e2e', 'data', 'state', 'auth');

/**
 * Creates a browser context with route interception to map ghost.test:2368
 * to localhost:{port} while preserving the Origin header for Ghost's CSRF protection.
 */
export async function createContextWithRoute(
    browser: Browser,
    backendURL: string,
    options?: {role?: string}
): Promise<BrowserContext> {
    const port = new URL(backendURL).port;
    const storageState = options?.role ? path.join(AUTH_STATE_DIR, `${options.role}.json`) : undefined;
    
    if (storageState && !fs.existsSync(storageState)) {
        throw new Error(`Storage state file not found: ${storageState}. Run global setup first.`);
    }
    
    const context = await browser.newContext({
        baseURL: PLAYWRIGHT_BASE_URL,
        storageState,
        extraHTTPHeaders: {
            Origin: PLAYWRIGHT_BASE_URL
        }
    });
    
    await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === 'ghost.test') {
            url.hostname = 'localhost';
            url.port = port;
            const headers = route.request().headers();
            // Preserve Origin header to match what was used during authentication
            headers.Origin = PLAYWRIGHT_BASE_URL;
            await route.continue({url: url.toString(), headers});
        } else {
            await route.continue();
        }
    });
    
    return context;
}

