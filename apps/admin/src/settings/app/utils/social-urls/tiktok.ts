import {createPlatformValidator} from './platform-validator';

// TikTok usernames are ASCII-only by platform rule: letters, numbers,
// underscores and periods, 2–24 characters, no boundary or consecutive periods.
const tiktok = createPlatformValidator({
    domains: ['tiktok.com'],
    www: true,
    pathTypes: [
        {urlPrefix: '@', storagePrefix: '@', rule: {extra: '._', min: 2, max: 24, notAtBoundary: '.', notConsecutive: '.'}}
    ],
    errors: {
        invalidUrl: 'The URL must be in a format like https://www.tiktok.com/@yourUsername',
        invalidUsername: 'Your Username is not a valid TikTok Username'
    }
});

export const validateTikTokUrl = tiktok.validate;
export const tiktokHandleToUrl = tiktok.handleToUrl;
export const tiktokUrlToHandle = tiktok.urlToHandle;
