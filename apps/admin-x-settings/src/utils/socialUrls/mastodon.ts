import validator from 'validator';

// Validates and normalizes Mastodon URLs
export function validateMastodonUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like instance/@yourUsername or instance/@yourUsername@instance';
    if (!newUrl) {
        return '';
    }

    let normalizedUrl = newUrl;

    // Remove https:// or http:// if present
    normalizedUrl = normalizedUrl.replace(/^https?:\/\//, '');

    // Basic validation: must match something.tld/@username or something.tld/@username@instance
    if (!normalizedUrl.match(/^[^/]+\.[^/]+\/@[^/]+(@[^/]+)?$/)) {
        throw new Error(errMessage);
    }

    // Ensure the domain part is valid
    const domainMatch = normalizedUrl.match(/^([^/]+)/);
    if (domainMatch && !validator.isFQDN(domainMatch[1])) {
        throw new Error(errMessage);
    }

    return `https://${normalizedUrl}`;
}

// Converts a Mastodon handle (stored URL) to itself
export const mastodonHandleToUrl = (handle: string) => {
    const errMessage = 'Your Username is not a valid Mastodon Username';
    if (!handle) {
        throw new Error(errMessage);
    }

    // Basic validation: must match something.tld/@username or something.tld/@username@instance
    if (!handle.match(/^[^/]+\.[^/]+\/@[^/]+(@[^/]+)?$/)) {
        throw new Error(errMessage);
    }

    // Ensure the domain part is valid
    const domainMatch = handle.match(/^([^/]+)/);
    if (domainMatch && !validator.isFQDN(domainMatch[1])) {
        throw new Error(errMessage);
    }

    return `https://${handle}`;
};

// Extracts a Mastodon handle (full URL without https://) from a URL
export const mastodonUrlToHandle = (url: string) => {
    // Remove https:// or http:// if present
    const normalizedUrl = url.replace(/^https?:\/\//, '');

    // Check if it matches the expected pattern
    if (normalizedUrl.match(/^[^/]+\.[^/]+\/@[^/]+(@[^/]+)?$/)) {
        return normalizedUrl;
    }

    return null;
};