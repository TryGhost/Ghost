import {INSTAGRAM_USERNAME_RULE} from './instagram';
import {createPlatformValidator} from './platform-validator';

// Threads accounts are Instagram accounts, so the username rule is shared.
// threads.com URLs are accepted and canonicalised to www.threads.net.
const threads = createPlatformValidator({
    domains: ['threads.net', 'threads.com'],
    www: true,
    pathTypes: [
        // /@username is the canonical form, but /username also resolves (it
        // redirects on threads.net), so URLs without the @ are accepted too
        {urlPrefix: '@', storagePrefix: '@', rule: INSTAGRAM_USERNAME_RULE},
        {urlPrefix: '', storagePrefix: '@', rule: INSTAGRAM_USERNAME_RULE}
    ],
    errors: {
        invalidUrl: 'The URL must be in a format like https://www.threads.net/@yourUsername',
        invalidUsername: 'The URL must be in a format like https://www.threads.net/@yourUsername'
    }
});

export const validateThreadsUrl = threads.validate;
export const threadsHandleToUrl = threads.handleToUrl;
export const threadsUrlToHandle = threads.urlToHandle;
