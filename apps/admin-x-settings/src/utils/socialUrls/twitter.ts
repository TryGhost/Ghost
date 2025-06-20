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

export const twitterHandleToUrl = (handle: string) => `https://x.com/${handle.replace('@', '')}`;

export const twitterUrlToHandle = (url: string) => {
    const handle = url.match(/(?:https:\/\/)(?:x\.com)\/(?:#!\/)?@?([^/]*)/)?.[1];
    return handle ? `@${handle}` : null;
}; 