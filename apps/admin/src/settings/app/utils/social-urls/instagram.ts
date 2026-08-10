import {createPlatformValidator} from './platform-validator';
import type {UsernameRule} from './platform-validator';

// Instagram usernames are ASCII-only by platform rule: letters, numbers,
// underscores and periods, up to 30 characters, with no leading, trailing or
// consecutive periods. Threads reuses this rule — Threads accounts are
// Instagram accounts.
export const INSTAGRAM_USERNAME_RULE: UsernameRule = {
    extra: '._',
    min: 1,
    max: 30,
    notAtBoundary: '.',
    notConsecutive: '.'
};

const instagram = createPlatformValidator({
    domains: ['instagram.com'],
    www: true,
    pathTypes: [
        {urlPrefix: '', storagePrefix: '', rule: INSTAGRAM_USERNAME_RULE}
    ],
    errors: {
        invalidUrl: 'The URL must be in a format like https://www.instagram.com/yourUsername',
        invalidUsername: 'Your Username is not a valid Instagram Username'
    }
});

export const validateInstagramUrl = instagram.validate;
export const instagramHandleToUrl = instagram.handleToUrl;
export const instagramUrlToHandle = instagram.urlToHandle;
