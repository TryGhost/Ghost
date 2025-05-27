import fetch from 'node-fetch';
import logging from '@tryghost/logging';

async function globalSetup() {
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
        } else {
            logging.info('✅ Ghost setup already completed');

            // Try to login to verify the admin user exists and credentials are correct
            const sessionResponse = await fetch(`${baseURL}/ghost/api/admin/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept-Version': 'v5.0',
                    Origin: baseURL
                },
                body: JSON.stringify({
                    username: adminUsername,
                    password: adminPassword
                })
            });

            if (sessionResponse.status === 201) {
                logging.info('✅ Admin user credentials verified');
            } else if (sessionResponse.status === 403) {
                // This might be a 2FA requirement, which is fine
                const responseBody = await sessionResponse.json();
                if (responseBody.errors && responseBody.errors[0] && responseBody.errors[0].type === 'Needs2FAError') {
                    logging.info('✅ Admin user exists (2FA required)');
                } else {
                    logging.warn('⚠️  Could not verify admin credentials:', responseBody);
                }
            } else {
                logging.warn('⚠️  Could not verify admin credentials. Status:', sessionResponse.status);
            }
        }
    } catch (error) {
        logging.error('❌ Global setup failed:', error);
        throw error;
    }
}

export default globalSetup;
