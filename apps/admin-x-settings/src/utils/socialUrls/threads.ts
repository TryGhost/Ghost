import validator from 'validator';

export function validateThreadsUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like https://www.threads.net/@yourUsername';
    if (!newUrl) {
        return '';
    }

    // If it's a full URL, validate it
    if (newUrl.startsWith('http')) {
        // Only allow threads.net or threads.com domains
        if (!newUrl.includes('threads.net') && !newUrl.includes('threads.com')) {
            throw new Error(errMessage);
        }

        // Convert threads.com to threads.net
        newUrl = newUrl.replace('threads.com', 'threads.net');
        
        // Ensure www. is present
        if (!newUrl.includes('www.')) {
            newUrl = newUrl.replace('https://', 'https://www.');
        }

        // Validate the URL
        if (!validator.isURL(newUrl)) {
            throw new Error(errMessage);
        }

        // Final check to ensure the URL matches the expected format
        if (!newUrl.match(/^https:\/\/www\.threads\.net\/@?[a-zA-Z0-9._]+$/)) {
            throw new Error(errMessage);
        }

        return newUrl;
    }

    // If it's just a username, validate it and convert to URL
    if (!newUrl.includes('/')) {
        // Remove @ if present
        if (newUrl.startsWith('@')) {
            newUrl = newUrl.slice(1);
        }

        // Check for valid username characters
        if (!newUrl.match(/^[a-zA-Z0-9._]+$/)) {
            throw new Error(errMessage);
        }

        // Convert to full URL
        return `https://www.threads.net/@${newUrl}`;
    }

    // If we get here, it's an invalid format
    throw new Error(errMessage);
}

export const threadsHandleToUrl = (handle: string) => `https://www.threads.net/${handle}`;

export const threadsUrlToHandle = (url: string) => {
    const handle = url.match(/(?:https:\/\/)(?:www\.)?(?:threads\.(?:com|net))(?:\/)?(?:#!\/)?@?([^/]*)/)?.[1];
    return handle ? `@${handle}` : null;
};
