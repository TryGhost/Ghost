import validator from 'validator';

// Validates and normalizes YouTube URLs or handles
export function validateYouTubeUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like https://www.youtube.com/@yourUsername, https://www.youtube.com/user/yourUsername, or https://www.youtube.com/channel/yourChannelId';
    const invalidUsernameMessage = 'Your Username is not a valid YouTube Username';
    if (!newUrl) {
        return '';
    }

    let handle: string;

    // Extract handle from URL or input
    if (newUrl.startsWith('http') || newUrl.startsWith('www.') || newUrl.includes('youtube.com')) {
        // Check for youtube.com domain
        if (!newUrl.includes('youtube.com')) {
            throw new Error(errMessage);
        }

        // Extract handle (@username, user/username, or channel/UC...)
        const handleMatch = newUrl.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/((?:@|user\/|channel\/)[^/]+)/);
        if (!handleMatch) {
            throw new Error(errMessage);
        }
        handle = handleMatch[1];
    } else {
        // Handle direct input (@username, user/username, channel/UC...)
        handle = newUrl;
    }

    // Validate handle based on type
    if (handle.startsWith('@')) {
        // Handle-based username: 3–30 chars, alphanumeric, underscore, hyphen, period, no leading/trailing period/hyphen
        const username = handle.slice(1);
        if (
            !username.match(/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,28}[a-zA-Z0-9]$/) ||
            username.includes('..') ||
            username.length > 30
        ) {
            throw new Error(invalidUsernameMessage);
        }
    } else if (handle.startsWith('user/')) {
        // Legacy user-based username: 1–50 chars, alphanumeric, underscore, hyphen, period
        const username = handle.slice(5);
        if (!username.match(/^[a-zA-Z0-9._-]{1,50}$/)) {
            throw new Error(invalidUsernameMessage);
        }
    } else if (handle.startsWith('channel/')) {
        // Channel ID: 24 chars, starts with UC, alphanumeric
        const channelId = handle.slice(8);
        if (!channelId.match(/^UC[a-zA-Z0-9_-]{22}$/)) {
            throw new Error(invalidUsernameMessage);
        }
    } else {
        throw new Error(errMessage);
    }

    // Construct and validate full URL
    const normalizedUrl = `https://www.youtube.com/${handle}`;
    if (!validator.isURL(normalizedUrl)) {
        throw new Error(errMessage);
    }

    return normalizedUrl;
}

// Converts a YouTube handle to a full URL
export const youtubeHandleToUrl = (handle: string) => {
    const errMessage = 'Your Username is not a valid YouTube Username';
    if (!handle) {
        throw new Error(errMessage);
    }

    // Validate handle based on type
    if (handle.startsWith('@')) {
        const username = handle.slice(1);
        if (
            !username.match(/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,28}[a-zA-Z0-9]$/) ||
            username.includes('..') ||
            username.length > 30
        ) {
            throw new Error(errMessage);
        }
    } else if (handle.startsWith('user/')) {
        const username = handle.slice(5);
        if (!username.match(/^[a-zA-Z0-9._-]{1,50}$/)) {
            throw new Error(errMessage);
        }
    } else if (handle.startsWith('channel/')) {
        const channelId = handle.slice(8);
        if (!channelId.match(/^UC[a-zA-Z0-9_-]{22}$/)) {
            throw new Error(errMessage);
        }
    } else {
        throw new Error('The handle must be in a format like @yourUsername, user/yourUsername, or channel/yourChannelId');
    }

    return `https://www.youtube.com/${handle}`;
};

// Extracts a YouTube handle from a URL
export const youtubeUrlToHandle = (url: string) => {
    const handleMatch = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/((?:@|user\/|channel\/)[^/]*)/);
    return handleMatch ? handleMatch[1] : null;
};
