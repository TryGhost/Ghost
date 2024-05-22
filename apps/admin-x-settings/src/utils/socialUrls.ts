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

export const facebookHandleToUrl = (handle: string) => `https://www.facebook.com/${handle}`;
export const twitterHandleToUrl = (handle: string) => `https://x.com/${handle.replace('@', '')}`;

export const facebookUrlToHandle = (url: string) => url.match(/(?:https:\/\/)(?:www\.)(?:facebook\.com)\/(?:#!\/)?(\w+\/?\S+)/mi)?.[1] || null;
export const twitterUrlToHandle = (url: string) => {
    const handle = url.match(/(?:https:\/\/)(?:x\.com)\/(?:#!\/)?@?([^/]*)/)?.[1];
    return handle ? `@${handle}` : null;
};
