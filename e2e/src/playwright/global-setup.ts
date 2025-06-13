import logging from '@tryghost/logging';
import {resetDb} from '../database';

async function globalSetup() {
    logging.debug('globalSetup:begin');
    const baseURL = process.env.BASE_URL || 'http://localhost:2368';
    const adminUsername = process.env.ADMIN_USERNAME || 'test@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'testpassword123';

    logging.info('🔧 Running global setup...');

    try {
        // Check if setup has already been completed
        const setupCheckResponse = await fetch(`${baseURL}/ghost/api/admin/authentication/setup`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Version': 'v5.0'
            }
        });

        const setupStatus = await setupCheckResponse.json();

        if (setupStatus.setup && setupStatus.setup[0] && setupStatus.setup[0].status === false) {
            logging.info('📝 Ghost setup not completed. Creating admin user...');

            // Perform initial setup with admin user
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

            // Perform initial login to mark user as having logged in
            // Otherwise 2FA is skipped because it's the first login
            logging.info('🔐 Performing initial login...');
            const loginResponse = await fetch(`${baseURL}/ghost/api/admin/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept-Version': 'v5.0'
                },
                body: JSON.stringify({
                    username: adminUsername,
                    password: adminPassword
                })
            });

            if (!loginResponse.ok) {
                const error = await loginResponse.text();
                logging.warn(`Initial login failed: ${loginResponse.status} - ${error}`);
            } else {
                logging.info('✅ Initial login completed');
            }
        } else {
            throw new Error('Ghost setup already completed');
        }
    } catch (error) {
        logging.error('❌ Global setup failed:', error);
        throw error;
    }

    await resetDb();
    logging.debug('globalSetup:end');
}

export default globalSetup;
