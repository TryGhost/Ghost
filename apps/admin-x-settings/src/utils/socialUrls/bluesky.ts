import validator from 'validator';

function isValidBlueskyUsername(username: string): boolean {
    const validUsernamePatterns = [
        // DID username: did:plc: + 24 chars
        /^did:plc:[a-zA-Z0-9._]{24}$/, 
        // Regular username: max 15 chars
        /^[a-zA-Z0-9._]{1,15}$/,
        // Domain username: requires dot, max 191 chars
        // length check needs to be at the front because of the +, otherwise could go over 191 
        /^(?=.{1,191}$)[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/
    ];
    
    return validUsernamePatterns.some(pattern => pattern.test(username));
}

export function validateBlueskyUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like https://bsky.app/profile/yourUsername';
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
    if (!isValidBlueskyUsername(username)) {
        throw new Error('Your Username is not a valid Bluesky Username');
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
    if (!isValidBlueskyUsername(username)) {
        throw new Error(errMessage);
    }

    return `https://bsky.app/profile/${username}`;
};

export const blueskyUrlToHandle = (url: string) => {
    const handleMatch = url.match(/(?:https?:\/\/)?(?:www\.)?bsky\.app\/profile\/@?([^/]*)/);
    return handleMatch ? `${handleMatch[1]}` : null;
};