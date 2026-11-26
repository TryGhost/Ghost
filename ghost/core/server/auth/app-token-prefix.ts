/**
 * The OAuth provider puts this at the start of every app token, so the Admin API will be able
 * to tell one apart from other Bearer credentials before looking it up.
 */
export const APP_TOKEN_PREFIX = 'ghost_app_';
