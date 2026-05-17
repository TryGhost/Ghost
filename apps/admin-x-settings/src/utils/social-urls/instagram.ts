import validator from 'validator';

// Validates and normalizes Instagram URLs or handles
export function validateInstagramUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like https://www.instagram.com/yourUsername';
    const invalidUsernameMessage = 'Your Username is not a valid Instagram Username';
    if (!newUrl) {
        return '';
    }

    // Allow mid-typing: don't reject URLs that are clearly incomplete
    if (newUrl.length < 3 && !newUrl.includes('instagram.com')) {
        // User is still typing a short handle — don't validate aggressively
        return '';
    }

    let username: string;

    // Extract username from URL or handle
    if (newUrl.startsWith('http') || newUrl.startsWith('www.') || newUrl.includes('instagram.com')) {
        // Check for instagram.com domain
        if (!newUrl.includes('instagram.com')) {
            throw new Error(errMessage);
        }

        // Extract username from URL
        const usernameMatch = newUrl.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/@?([^/]+)/);
        if (!usernameMatch) {
            throw new Error(errMessage);
        }
        username = usernameMatch[1];
    } else {
        // Handle username or @username
        username = newUrl.startsWith('@') ? newUrl.slice(1) : newUrl;
    }

    // Validate username: alphanumeric, underscore, period, 1–30 chars, no leading/trailing/consecutive periods
    // Allow short or incomplete usernames during typing (no final validation until complete)
    if (
        !username.match(/^[a-zA-Z0-9_][a-zA-Z0-9._]{0,28}[a-zA-Z0-9_]$/) ||
        username.includes('..') ||
        username.length > 30
    ) {
        // If the username is short (1-2 chars), it's likely mid-typing — don't throw
        if (username.trim().length >= 3) {
            throw new Error(invalidUsernameMessage);
        }
        return '';
    }

    // Construct and validate full URL
    const normalizedUrl = `https://www.instagram.com/${username}`;
    if (!validator.isURL(normalizedUrl)) {
        throw new Error(errMessage);
    }

    return normalizedUrl;
}

// Converts an Instagram handle to a full URL
export const instagramHandleToUrl = (handle: string) => {
    const errMessage = 'Your Username is not a valid Instagram Username';
    if (!handle) {
        throw new Error(errMessage);
    }

    let username = handle;
    if (username.startsWith('@')) {
        username = username.slice(1);
    }

    // Validate username: alphanumeric, underscore, period, 1–30 chars, no leading/trailing/consecutive periods
    if (
        !username.match(/^[a-zA-Z0-9_][a-zA-Z0-9._]{0,28}[a-zA-Z0-9_]$/) ||
        username.includes('..') ||
        username.length > 30
    ) {
        throw new Error(errMessage);
    }

    return `https://www.instagram.com/${username}`;
};

// Extracts an Instagram handle from a URL
export const instagramUrlToHandle = (url: string) => {
    const handleMatch = url.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/@?([^/]*)/);
    return handleMatch ? `${handleMatch[1]}` : null;
};
