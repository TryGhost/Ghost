import {createPlatformValidator} from './platform-validator';

// X handles are ASCII-only by platform rule: 1–15 letters, numbers or underscores.
// twitter.com URLs are accepted and canonicalised to x.com.
const twitter = createPlatformValidator({
    domains: ['x.com', 'twitter.com'],
    www: false,
    pathTypes: [
        {urlPrefix: '', storagePrefix: '@', rule: {extra: '_', min: 1, max: 15}}
    ],
    errors: {
        invalidUrl: 'The URL must be in a format like https://x.com/yourUsername',
        invalidUsername: 'Your Username is not a valid Twitter Username'
    }
});

export const validateTwitterUrl = twitter.validate;
export const twitterHandleToUrl = twitter.handleToUrl;
export const twitterUrlToHandle = twitter.urlToHandle;
