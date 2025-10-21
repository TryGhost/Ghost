import dotenv from 'dotenv';
import {faker} from '@faker-js/faker';
// load environment variables from .env file
dotenv.config();

// Simple config object with just the values
export const appConfig = {
    baseURL: process.env.GHOST_BASE_URL || 'http://localhost:2368',

    auth: {
        email: `test+${faker.string.uuid()}@ghost.org`,
        password: process.env.E2E_ACCOUNT_PASSWORD || 'test@123@test',
        storageFile: 'playwright/.auth/user.json'
    },
    debugLogs: process.env.E2E_DEBUG_LOGS === 'true' || process.env.E2E_DEBUG_LOGS === '1'
};
