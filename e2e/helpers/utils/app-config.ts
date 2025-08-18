import dotenv from 'dotenv';
// load environment variables
dotenv.config();

// Simple config object with just the values
export const appConfig = {
    baseURL: process.env.GHOST_BASE_URL || 'http://localhost:2368',

    auth: {
        email: process.env.E2E_ACCOUNT_USERNAME || '',
        password: process.env.E2E_ACCOUNT_PASSWORD || '',
        storageFile: 'playwright/.auth/user.json'
    },
    debugLogs: process.env.E2E_DEBUG_LOGS === 'true' || process.env.E2E_DEBUG_LOGS === '1'
};
