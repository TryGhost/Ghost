import validator from 'validator';

export function validateBlueskyUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like https://bsky.app/profile/yourUsername';
    const invalidUsernameMessage = 'Your Username is not a valid Bluesky Username';
    if (!newUrl) {
        return '';
    }

    let username: string;

    // Extract username from URL or handle
    if (newUrl.startsWith('http') || newUrl.startsWith('www.') || newUrl.includes('bsky.app')) {
        // Only allow bsky.app domain
        if (!newUrl.includes('bsky.app')) {
            throw new Error(errMessage);
        }

        // Extract username from URL
        const usernameMatch = newUrl.match(/bsky\.app\/profile\/@?([^/]+)/);
        if (!usernameMatch) {
            throw new Error(errMessage);
        }
        username = usernameMatch[1];
    } else {
        // Handle username or @username
        username = newUrl.startsWith('@') ? newUrl.slice(1) : newUrl;
    }

    // Validate username
    // Regular username: alphanumeric, underscore, max 15 chars
    const isRegularUsername = !username.includes('.');
    if (isRegularUsername) {
        if (!username.match(/^[a-zA-Z0-9._]{1,15}$/)) {
            throw new Error(invalidUsernameMessage);
        }
    } else {
        // Domain-based username: alphanumeric, dots, hyphens, at least one dot, reasonable length
        if (!username.match(/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/) || username.length > 253) {
            throw new Error(invalidUsernameMessage);
        }
    }

    // Construct and validate full URL
    const normalizedUrl = `https://bsky.app/profile/${username}`;
    if (!validator.isURL(normalizedUrl)) {
        throw new Error(errMessage);
    }

    return normalizedUrl;
}

export const blueskyHandleToUrl = (handle: string) => {
    const errMessage = 'Your Username is not a valid Bluesky Username';
    if (!handle) {
        throw new Error(errMessage);
    }

    let username = handle;
    if (username.startsWith('@')) {
        username = username.slice(1);
    }

    // Validate username
    const isRegularUsername = !username.includes('.');
    if (isRegularUsername) {
        if (!username.match(/^[a-zA-Z0-9._]{1,15}$/)) {
            throw new Error(errMessage);
        }
    } else {
        if (!username.match(/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/) || username.length > 191) { // 191 is the max length due to database constraints
            throw new Error(errMessage);
        }
    }

    return `https://bsky.app/profile/${username}`;
};

export const blueskyUrlToHandle = (url: string) => {
    const handleMatch = url.match(/(?:https?:\/\/)?(?:www\.)?bsky\.app\/profile\/@?([^/]*)/);
    return handleMatch ? `${handleMatch[1]}` : null;
};