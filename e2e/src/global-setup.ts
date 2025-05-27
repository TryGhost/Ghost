import {FullConfig} from '@playwright/test';

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForGhost(baseURL: string, maxRetries = 30, retryDelay = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`${baseURL}/ghost/api/admin/site/`, {
                method: 'GET',
                headers: {
                    'Accept-Version': 'v5.0'
                }
            });

            if (response.ok) {
                return;
            }
        } catch (error) {
            // Ghost not ready yet, continue retrying
        }

        if (i < maxRetries - 1) {
            await sleep(retryDelay);
        }
    }

    throw new Error(`Ghost not ready after ${maxRetries} attempts`);
}

async function globalSetup(): Promise<void> {
    const baseURL = process.env.BASE_URL || 'http://localhost:2368';
    const adminUsername = process.env.ADMIN_USERNAME || 'test@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'testpassword123';

    try {
        // Wait for Ghost to be ready before attempting setup
        await waitForGhost(baseURL);

        // Check if setup has already been completed
        const setupCheckResponse = await fetch(`${baseURL}/ghost/api/admin/authentication/setup`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Version': 'v5.0'
            }
        });

        const setupStatus = await setupCheckResponse.json();

        if (setupStatus.setup && setupStatus.setup[0]?.status === true) {
            return;
        }

        // Setup Ghost with admin user
        const setupResponse = await fetch(`${baseURL}/ghost/api/admin/authentication/setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Version': 'v5.0'
            },
            body: JSON.stringify({
                setup: [{
                    name: 'Test Admin',
                    email: adminUsername,
                    password: adminPassword,
                    blogTitle: 'Test Blog'
                }]
            })
        });

        if (!setupResponse.ok) {
            const errorText = await setupResponse.text();
            throw new Error(`Setup failed: ${setupResponse.status} ${errorText}`);
        }

        await setupResponse.json();
    } catch (error) {
        throw error;
    }
}

export default globalSetup;
