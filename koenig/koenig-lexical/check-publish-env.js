import 'dotenv/config';

if (!process.env.VITE_SENTRY_AUTH_TOKEN) {
    throw new Error('VITE_SENTRY_AUTH_TOKEN is not set in your .env file - this is required when publishing');
}
