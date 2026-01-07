import validator from 'validator';

// Validates and normalizes Mastodon URLs
export function validateMastodonUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like @username@instance.tld or https://instance.tld/@username or https://website.com/@username@instance.tld';
    if (!newUrl) {
        return '';
    }

    let normalizedUrl = newUrl;

    // Remove https:// or http:// if present
    normalizedUrl = normalizedUrl.replace(/^https?:\/\//, '');

    // Check if it's in @username@instance format
    if (normalizedUrl.match(/^@[^@]+@[^/]+$/)) {
        const [username, instance] = normalizedUrl.split('@').slice(1);
        if (!validator.isFQDN(instance)) {
            throw new Error(errMessage);
        }
        return `https://${instance}/@${username}`;
    }

    // Check if it's in instance/@username format
    if (normalizedUrl.match(/^[^/]+\.[^/]+\/@[^/]+(@[^/]+)?$/)) {
        const [instance, rest] = normalizedUrl.split('/@');
        if (!validator.isFQDN(instance)) {
            throw new Error(errMessage);
        }

        // If there's a second @, validate that part too
        if (rest.includes('@')) {
            const [, userInstance] = rest.split('@');
            if (!validator.isFQDN(userInstance)) {
                throw new Error(errMessage);
            }
        }

        return `https://${normalizedUrl}`;
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
        if (!validator.isFQDN(instance)) {
            throw new Error(errMessage);
        }
        return `https://${instance}/@${username}`;
    }

    // Check if it's in instance/@username format
    if (handle.match(/^[^/]+\.[^/]+\/@[^/]+(@[^/]+)?$/)) {
        const [instance, rest] = handle.split('/@');
        if (!validator.isFQDN(instance)) {
            throw new Error(errMessage);
        }

        // If there's a second @, validate that part too
        if (rest.includes('@')) {
            const [, userInstance] = rest.split('@');
            if (!validator.isFQDN(userInstance)) {
                throw new Error(errMessage);
            }
        }

        return `https://${handle}`;
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

export const sanitiseMastodonUrl = (url: string) => {
    return url.replace(/^https?:\/\//, '');
};
