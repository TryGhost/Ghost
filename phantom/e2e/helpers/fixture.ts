import {test as base} from '@playwright/test';

export interface User {
    name: string;
    email: string;
    password: string;
}

// The seeded owner from src/tools/seed-e2e.ts — the imported fixture site's
// only staff account.
export const OWNER: User = {
    name: 'Fixture Ghosty',
    email: 'test@ghost.org',
    password: 'Sl1m3rson99'
};

interface PhantomFixtures {
    ghostAccountOwner: User;
    // Auto fixture: returns the database to the seeded baseline before each
    // test, the single-server stand-in for upstream's per-test instances.
    _resetDatabase: void;
}

// API login for projects that don't share the main storage state (the
// host-settings servers have their own databases).
export const loginOwnerViaApi = async (page: import('@playwright/test').Page) => {
    const response = await page.request.post('/ghost/api/admin/session/', {
        data: {username: OWNER.email, password: OWNER.password}
    });
    if (!response.ok()) {
        throw new Error(`owner login failed: ${response.status()}`);
    }
};

export const test = base.extend<PhantomFixtures>({
    ghostAccountOwner: async ({}, use) => {
        await use(OWNER);
    },
    _resetDatabase: [async ({request}, use) => {
        const response = await request.post('/__e2e__/reset');
        if (!response.ok()) {
            throw new Error(`e2e reset failed: ${response.status()}`);
        }
        await use();
    }, {auto: true}]
});

export {expect} from '@playwright/test';
