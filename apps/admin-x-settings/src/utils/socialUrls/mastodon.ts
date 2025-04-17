import validator from 'validator';

// Validates and normalizes Mastodon URLs
export function validateMastodonUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like @username@instance or https://instance/@username or website/@username@instance';
    if (!newUrl) {
        return '';
    }

    let normalizedUrl = newUrl;

    // Remove https:// or http:// if present
    normalizedUrl = normalizedUrl.replace(/^https?:\/\//, '');

    // Check if it's in @username@instance format
    if (normalizedUrl.match(/^@[^@]+@[^/]+$/)) {
        const [username, instance] = normalizedUrl.split('@').slice(1);
        return `https://${instance}/@${username}`;
    }

    // Check if it's in instance/@username format
    if (normalizedUrl.match(/^[^/]+\.[^/]+\/@[^/]+(@[^/]+)?$/)) {
        const [instance] = normalizedUrl.split('/@');
        if (validator.isFQDN(instance)) {
            return `https://${normalizedUrl}`;
        }
    }

    throw new Error(errMessage);
}

// Converts a Mastodon handle to URL
export const mastodonHandleToUrl = (handle: string) => {
    const errMessage = 'Your Username is not a valid Mastodon Username';
    if (!handle) {
        throw new Error(errMessage);
    }

    // Check if it's in @username@instance format
    if (handle.match(/^@[^@]+@[^/]+$/)) {
        const [username, instance] = handle.split('@').slice(1);
        if (validator.isFQDN(instance)) {
            return `https://${instance}/@${username}`;
        }
    }

    // Check if it's in instance/@username format
    if (handle.match(/^[^/]+\.[^/]+\/@[^/]+(@[^/]+)?$/)) {
        const [instance] = handle.split('/@');
        if (validator.isFQDN(instance)) {
            return `https://${handle}`;
        }
    }

    throw new Error(errMessage);
};

// Extracts a Mastodon handle from a URL
export const mastodonUrlToHandle = (url: string) => {
    if (!url) {
        return null;
    }

    // Remove https:// or http:// if present
    const normalizedUrl = url.replace(/^https?:\/\//, '');

    // Check if it matches instance/@username@instance format
    const match = normalizedUrl.match(/^([^/]+\.[^/]+)\/@([^@]+)@([^/]+)$/);
    if (match) {
        const [, hostInstance, username, userInstance] = match;
        if (validator.isFQDN(hostInstance) && validator.isFQDN(userInstance)) {
            // Return the full format including host instance
            return `${hostInstance}/@${username}@${userInstance}`;
        }
    }

    // Check if it matches instance/@username format
    const simpleMatch = normalizedUrl.match(/^([^/]+\.[^/]+)\/@([^/]+)$/);
    if (simpleMatch) {
        const [, instance, username] = simpleMatch;
        if (validator.isFQDN(instance)) {
            return `@${username}@${instance}`;
        }
    }

    return null;
};
