import validator from 'validator';

export function validateFacebookUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like https://www.facebook.com/yourPage';
    if (!newUrl) {
        return '';
    }

    // strip any facebook URLs out
    newUrl = newUrl.replace(/(https?:\/\/)?(www\.)?facebook\.com/i, '');

    // don't allow any non-facebook urls
    if (newUrl.match(/^(http|\/\/)/i)) {
        throw new Error(errMessage);
    }

    // strip leading / if we have one then concat to full facebook URL
    newUrl = newUrl.replace(/^\//, '');
    newUrl = `https://www.facebook.com/${newUrl}`;

    // don't allow URL if it's not valid
    if (!validator.isURL(newUrl)) {
        throw new Error(errMessage);
    }

    return newUrl;
}

export function validateTwitterUrl(newUrl: string) {
    if (!newUrl) {
        return '';
    }
    if (newUrl.match(/(?:x\.com\/)(\S+)/) || newUrl.match(/([a-z\d.]+)/i)) {
        let username = [];

        if (newUrl.match(/(?:x\.com\/)(\S+)/)) {
            [, username] = newUrl.match(/(?:x\.com\/)(\S+)/);
        } else {
            [username] = newUrl.match(/([^/]+)\/?$/mi);
        }

        if (username.startsWith('@')) {
            username = username.slice(1);
        }

        // check if username starts with http or www and show error if so
        if (username.match(/^(http|www)|(\/)/) || !username.match(/^[a-z\d._]{1,15}$/mi)) {
            const message = !username.match(/^[a-z\d._]{1,15}$/mi)
                ? 'Your Username is not a valid Twitter Username'
                : 'The URL must be in a format like https://x.com/yourUsername';
            throw new Error(message);
        }
        return `https://x.com/${username}`;
    } else {
        const message = 'The URL must be in a format like https://x.com/yourUsername';
        throw new Error(message);
    }
}

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

export const facebookHandleToUrl = (handle: string) => `https://www.facebook.com/${handle}`;
export const twitterHandleToUrl = (handle: string) => `https://x.com/${handle.replace('@', '')}`;
export const threadsHandleToUrl = (handle: string) => `https://www.threads.net/${handle}`;

export const facebookUrlToHandle = (url: string) => url.match(/(?:https:\/\/)(?:www\.)(?:facebook\.com)\/(?:#!\/)?(\w+\/?\S+)/mi)?.[1] || null;
export const twitterUrlToHandle = (url: string) => {
    const handle = url.match(/(?:https:\/\/)(?:x\.com)\/(?:#!\/)?@?([^/]*)/)?.[1];
    return handle ? `@${handle}` : null;
};

export const threadsUrlToHandle = (url: string) => {
    const handle = url.match(/(?:https:\/\/)(?:www\.)?(?:threads\.(?:com|net))(?:\/)?(?:#!\/)?@?([^/]*)/)?.[1];
    return handle ? `@${handle}` : null;
};
