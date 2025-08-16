import dotenv from 'dotenv';
dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logging = require('@tryghost/logging');
import {appConfig} from './app-config';

async function setupUser() {
    const baseURL = appConfig.baseURL;
    const adminUsername = appConfig.auth.email;
    const adminPassword = appConfig.auth.password;

    try {
        const setupCheckResponse = await fetch(`${baseURL}/ghost/api/admin/authentication/setup`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Version': 'v5.0'
            }
        });

        const setupStatus = await setupCheckResponse.json();

        if (setupStatus.setup && setupStatus.setup[0] && setupStatus.setup[0].status === false) {
            logging.info('Ghost setup not completed. Creating admin user...');

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
                const error = await setupResponse.text();
                throw new Error(`Failed to setup Ghost: ${setupResponse.status} - ${error}`);
            }

            logging.info('✅ Admin user created successfully');
        } else {
            throw new Error('Ghost setup already completed');
        }
    } catch (error) {
        logging.error('❌ Global setup failed:', error);
        throw error;
    }
}

setupUser();

export default setupUser;
