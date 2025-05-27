import {setupTestEnvironment} from './src/fixtures/setup';

async function globalSetup() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:2368';
    const adminEmail = process.env.ADMIN_USERNAME || 'test@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SuperSecure123!@#';

    await setupTestEnvironment({
        baseUrl,
        adminEmail,
        adminPassword
    });
}

export default globalSetup;
