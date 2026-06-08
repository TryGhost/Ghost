import validator from 'validator';

const ERRORS = {
    INVALID_USERNAME: 'Your Username is not a valid Bluesky Username',
    INVALID_URL: 'The URL must be in a format like https://bsky.app/profile/yourUsername'
};

function isValidBlueskyUsername(username: string): boolean {
    const validUsernamePatterns = [
        // DID username: did:plc: + 24-character Base32 identifier (lowercase a–z, digits 2–7)
        /^did:plc:[a-z2-7]{24}$/, 
        // Regular username: max 15 chars
        /^[a-zA-Z0-9._]{1,15}$/,
        // Domain username: requires dot, max 191 chars
        // length check needs to be at the front because of the +, otherwise could go over 191 
        /^(?=.{1,191}$)[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/
    ];
    
    return validUsernamePatterns.some(pattern => pattern.test(username));
}

function formatUsername(username: string) {
    let formattedUsername = username.trim();

    if (formattedUsername.startsWith('@')) {
        formattedUsername = formattedUsername.slice(1);
    }

    if (formattedUsername.startsWith('did:plc:')) {
        return formattedUsername.toLowerCase();
    }

    return formattedUsername;
}

export function validateBlueskyUrl(handleOrUrl: string) {
    if (!handleOrUrl) {
        return '';
    }

    let username: string;

    // Extract username from URL or handle
    if (handleOrUrl.startsWith('http') || handleOrUrl.startsWith('www.') || handleOrUrl.includes('bsky.app')) {
        // Only allow bsky.app domain
        if (!handleOrUrl.includes('bsky.app')) {
            throw new Error(ERRORS.INVALID_URL);
        }

        // Extract username from URL
        const usernameMatch = handleOrUrl.match(/bsky\.app\/profile\/@?([^/]+)/);
        if (!usernameMatch) {
            throw new Error(ERRORS.INVALID_URL);
        }
        username = formatUsername(usernameMatch[1]);
    } else {
        // Handle username, @username or ensuring DID is lowercase
        username = formatUsername(handleOrUrl);
    }

    // Validate username
    if (!isValidBlueskyUsername(username)) {
        throw new Error(ERRORS.INVALID_USERNAME);
    }

    // Construct and validate full URL
    const normalizedUrl = `https://bsky.app/profile/${username}`;
    if (!validator.isURL(normalizedUrl)) {
        throw new Error(ERRORS.INVALID_URL);
    }

    return normalizedUrl;
}

export const blueskyHandleToUrl = (handle: string) => {
    if (!handle) {
        throw new Error(ERRORS.INVALID_USERNAME);
    }

    let username = formatUsername(handle);

    // Validate username
    if (!isValidBlueskyUsername(username)) {
        throw new Error(ERRORS.INVALID_USERNAME);
    }

    return `https://bsky.app/profile/${username}`;
};

export const blueskyUrlToHandle = (url: string) => {
    const handleMatch = url.match(/(?:https?:\/\/)?(?:www\.)?bsky\.app\/profile\/@?([^/]*)/);
    return handleMatch ? `${handleMatch[1]}` : null;
};