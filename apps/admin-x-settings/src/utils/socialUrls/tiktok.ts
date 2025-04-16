import validator from 'validator';

// Validates and normalizes TikTok URLs or handles
export function validateTikTokUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like https://www.tiktok.com/@yourUsername';
    const invalidUsernameMessage = 'Your Username is not a valid TikTok Username';
    if (!newUrl) {
        return '';
    }

    let handle: string;

    // Extract handle from URL or input
    if (newUrl.startsWith('http') || newUrl.startsWith('www.') || newUrl.includes('tiktok.com')) {
        // Check for tiktok.com domain
        if (!newUrl.includes('tiktok.com')) {
            throw new Error(errMessage);
        }

        // Extract handle (@username)
        const handleMatch = newUrl.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/(@[^/]+)/);
        if (!handleMatch) {
            throw new Error(errMessage);
        }
        handle = handleMatch[1];
    } else {
        // Handle username or @username
        handle = newUrl.startsWith('@') ? newUrl : `@${newUrl}`;
    }

    // Validate username: alphanumeric, underscore, period, 2–24 chars, no leading/consecutive periods
    const username = handle.slice(1); // Remove @ for validation
    if (
        !username.match(/^[a-zA-Z0-9][a-zA-Z0-9._]{0,22}[a-zA-Z0-9]$/) ||
        username.includes('..') ||
        username.length < 2 ||
        username.length > 24
    ) {
        throw new Error(invalidUsernameMessage);
    }

    // Construct and validate full URL
    const normalizedUrl = `https://www.tiktok.com/${handle}`;
    if (!validator.isURL(normalizedUrl)) {
        throw new Error(errMessage);
    }

    return normalizedUrl;
}

// Converts a TikTok handle to a full URL
export const tiktokHandleToUrl = (handle: string) => {
    const errMessage = 'Your Username is not a valid TikTok Username';
    if (!handle) {
        throw new Error(errMessage);
    }

    // Ensure handle starts with @
    const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const username = normalizedHandle.slice(1); // Remove @ for validation

    // Validate username: alphanumeric, underscore, period, 2–24 chars, no leading/consecutive periods
    if (
        !username.match(/^[a-zA-Z0-9][a-zA-Z0-9._]{0,22}[a-zA-Z0-9]$/) ||
        username.includes('..') ||
        username.length < 2 ||
        username.length > 24
    ) {
        throw new Error(errMessage);
    }

    return `https://www.tiktok.com/${normalizedHandle}`;
};

// Extracts a TikTok handle from a URL
export const tiktokUrlToHandle = (url: string) => {
    const handleMatch = url.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/(@[^/]*)/);
    return handleMatch ? handleMatch[1] : null;
};
