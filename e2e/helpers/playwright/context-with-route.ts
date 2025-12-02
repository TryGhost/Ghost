import * as fs from 'fs';
import * as path from 'path';
import {Browser, BrowserContext} from '@playwright/test';

const AUTH_STATE_DIR = path.join(process.cwd(), 'e2e', 'data', 'state', 'auth');

/**
 * Creates a browser context using the backend URL directly. Caddy proxy handles
 * Origin header rewriting for CSRF protection, so no route interception needed.
 * Also creates a separate APIRequestContext that uses the actual backend URL for direct HTTP requests.
 */
export async function createContextWithRoute(
    browser: Browser,
    backendURL: string,
    options?: {role?: string}
): Promise<BrowserContext> {
    const storageState = options?.role ? path.join(AUTH_STATE_DIR, `${options.role}.json`) : undefined;
    
    if (storageState && !fs.existsSync(storageState)) {
        throw new Error(`Storage state file not found: ${storageState}. Run global setup first.`);
    }
    
    // Context for page navigation - uses backend URL directly
    // Caddy proxy handles Origin header rewriting
    return await browser.newContext({
        baseURL: backendURL,
        storageState
    });
}

