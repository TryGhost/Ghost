import * as fs from 'fs';
import {AUTH_STATE_BY_ROLE, CANONICAL_ADMIN_ORIGIN, FixtureRole} from '@/helpers/utils/fixture-cache';
import {Browser, BrowserContext} from '@playwright/test';

export async function createContextWithAuthState(
    browser: Browser,
    backendURL: string,
    options?: {role?: FixtureRole}
): Promise<BrowserContext> {
    const storageStatePath = options?.role ? AUTH_STATE_BY_ROLE[options.role] : undefined;

    if (storageStatePath && !fs.existsSync(storageStatePath)) {
        throw new Error(`Storage state file not found: ${storageStatePath}. Run global setup first.`);
    }

    return await browser.newContext({
        baseURL: backendURL,
        storageState: storageStatePath,
        extraHTTPHeaders: {
            Origin: CANONICAL_ADMIN_ORIGIN
        }
    });
}
