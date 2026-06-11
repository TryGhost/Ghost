import {expect, test as setup} from '@playwright/test';
import {OWNER} from '../helpers/fixture';

// Logs in once via the admin session API and stores cookies for the main
// project, mirroring the authenticated state the upstream fixture provides.
setup('authenticate owner', async ({request}) => {
    const response = await request.post('/ghost/api/admin/session/', {
        data: {username: OWNER.email, password: OWNER.password}
    });
    expect(response.status()).toBe(201);
    await request.storageState({path: 'e2e/.auth/owner.json'});
});
