export const SOCIAL_WEB_USERNAME_MIN_LENGTH = 2;
export const SOCIAL_WEB_USERNAME_MAX_LENGTH = 100;
export const SOCIAL_WEB_USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function getHandleParts(handle?: string) {
    const match = handle?.match(/^@?([^@]+)@(.+)$/);

    return {
        username: match?.[1] ?? '',
        domain: match?.[2] ?? ''
    };
}

export function validateSocialWebUsername(username: string) {
    if (username.length < SOCIAL_WEB_USERNAME_MIN_LENGTH) {
        return `Username must be at least ${SOCIAL_WEB_USERNAME_MIN_LENGTH} characters.`;
    }

    if (username.length >= SOCIAL_WEB_USERNAME_MAX_LENGTH) {
        return `Username must be less than ${SOCIAL_WEB_USERNAME_MAX_LENGTH} characters.`;
    }

    if (!SOCIAL_WEB_USERNAME_PATTERN.test(username)) {
        return 'Username must contain only letters, numbers, and underscores.';
    }

    return null;
}
