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

export const facebookHandleToUrl = (handle: string) => `https://www.facebook.com/${handle}`;

export const facebookUrlToHandle = (url: string) => url.match(/(?:https:\/\/)(?:www\.)(?:facebook\.com)\/(?:#!\/)?(\w+\/?\S+)/mi)?.[1] || null; 