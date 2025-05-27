import {DatabaseFixture} from './database';

export interface SetupConfig {
    baseUrl: string;
    adminEmail: string;
    adminPassword: string;
}

export async function setupTestEnvironment(config: SetupConfig): Promise<void> {
    const {baseUrl, adminEmail, adminPassword} = config;

    // Check if Ghost is already set up
    const setupCheckResponse = await fetch(`${baseUrl}/ghost/api/admin/authentication/setup/`, {
        headers: {
            'Accept-Version': 'v5.0',
            'Content-Type': 'application/json'
        }
    });

    const setupStatus = await setupCheckResponse.json();

    if (!setupStatus.setup[0].status) {
        // Ghost is not set up, so set it up
        const setupResponse = await fetch(`${baseUrl}/ghost/api/admin/authentication/setup/`, {
            method: 'POST',
            headers: {
                'Accept-Version': 'v5.0',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                setup: [{
                    name: 'Test Admin',
                    email: adminEmail,
                    password: adminPassword,
                    blogTitle: 'E2E Test Blog'
                }]
            })
        });

        if (!setupResponse.ok) {
            const error = await setupResponse.text();
            throw new Error(`Failed to setup Ghost: ${error}`);
        }
    }

    // If we need to reset data between tests, we can use the database fixture
    const dbConfig = {
        database: process.env.MYSQL_DATABASE || 'ghost_test'
    };

    const db = new DatabaseFixture(dbConfig);
    await db.connect();
    await db.fastReset();
    await db.disconnect();
}

if (require.main === module) {
    setupTestEnvironment({
        baseUrl: process.env.GHOST_BASE_URL || 'http://localhost:2368',
        adminEmail: process.env.ADMIN_USERNAME || 'test@example.com',
        adminPassword: process.env.ADMIN_PASSWORD || 'SuperSecure123!@#'
    }).catch(() => {
        process.exit(1);
    });
}
