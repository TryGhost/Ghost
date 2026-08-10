import {createPlatformValidator} from './platform-validator';

const ERROR_MESSAGE = 'The URL must be in a format like https://www.facebook.com/yourPage';

// Facebook is deliberately the loosest platform: pages, groups, people/… and
// profile.php?id=… are all valid profile locations, so the whole path (query
// string included) is the stored handle and the only rule is "no whitespace".
const facebook = createPlatformValidator({
    domains: ['facebook.com'],
    www: true,
    fullPath: true,
    pathTypes: [
        {urlPrefix: '', storagePrefix: '', rule: {patterns: [/^\S+$/]}}
    ],
    errors: {
        invalidUrl: ERROR_MESSAGE,
        invalidUsername: ERROR_MESSAGE
    }
});

export const validateFacebookUrl = facebook.validate;
export const facebookHandleToUrl = facebook.handleToUrl;
export const facebookUrlToHandle = facebook.urlToHandle;
