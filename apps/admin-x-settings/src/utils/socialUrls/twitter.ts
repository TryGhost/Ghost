// x.com URLs with 1-15 characters, alphanumeric and underscores
const X_URL_REGEX = /^x\.com\/([a-zA-Z0-9_]{1,15})$/;

export function validateTwitterUrl(newUrl: string) {
    if (!newUrl) {
        return '';
    }
    if (newUrl.match(X_URL_REGEX) || newUrl.match(/([a-z\d.]+)/i)) {
        let username = [];

        if (newUrl.match(X_URL_REGEX)) {
            [, username] = newUrl.match(X_URL_REGEX);
        } else {
            [username] = newUrl.match(/([^/]+)\/?$/i);
        }

        if (username.startsWith('@')) {
            username = username.slice(1);
        }

        if (!username.match(/^[a-z\d_]{1,15}$/i)) {
            throw new Error('Your Username is not a valid Twitter Username');
        }

        return `https://x.com/${username}`;
    } else {
        const message = 'The URL must be in a format like https://x.com/yourUsername';
        throw new Error(message);
    }
}

export const twitterHandleToUrl = (handle: string) => `https://x.com/${handle.replace('@', '')}`;

export const twitterUrlToHandle = (url: string) => {
    const handle = url.match(/(?:https:\/\/)(?:x\.com)\/(?:#!\/)?@?([^/]*)/)?.[1];
    return handle ? `@${handle}` : null;
}; 