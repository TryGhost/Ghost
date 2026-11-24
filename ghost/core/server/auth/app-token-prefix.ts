/**
 * Every app token starts with this, under any auth engine, so the Admin API can tell one apart
 * from other Bearer credentials before it knows which engine issued it.
 */
export const APP_TOKEN_PREFIX = 'ghost_app_';
