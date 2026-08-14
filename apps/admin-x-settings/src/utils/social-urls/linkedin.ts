import {createPlatformValidator} from './platform-validator';
import type {UsernameRule} from './platform-validator';

// validation info: https://www.linkedin.com/help/linkedin/answer/a542685/manage-your-public-profile-url?lang=en
// Letters and numbers in any language (company/school slugs and vanity URLs
// can contain accented characters — see ONC-1856), hyphens, 3–100 characters.
const LINKEDIN_USERNAME_RULE: UsernameRule = {
    unicode: true,
    extra: '-',
    min: 3,
    max: 100
};

// /in/ profiles are stored as a bare handle; the other path types keep their
// prefix in storage. Regional subdomains (uk.linkedin.com) are valid input and
// stay in the validated URL, but are dropped from the stored handle.
const linkedin = createPlatformValidator({
    domains: ['linkedin.com'],
    www: true,
    regionalSubdomain: '[a-z]{2}',
    pathTypes: [
        {urlPrefix: 'in/', storagePrefix: '', handleAliases: ['in/'], rule: LINKEDIN_USERNAME_RULE},
        {urlPrefix: 'pub/', storagePrefix: 'pub/', rule: {...LINKEDIN_USERNAME_RULE, nestedSegments: true}},
        {urlPrefix: 'company/', storagePrefix: 'company/', rule: LINKEDIN_USERNAME_RULE},
        {urlPrefix: 'school/', storagePrefix: 'school/', rule: LINKEDIN_USERNAME_RULE}
    ],
    errors: {
        invalidUrl: 'The URL must be in a format like https://www.linkedin.com/in/yourUsername',
        invalidUsername: 'Your Username is not a valid LinkedIn Username'
    }
});

export const validateLinkedInUrl = linkedin.validate;
export const linkedinHandleToUrl = linkedin.handleToUrl;
export const linkedinUrlToHandle = linkedin.urlToHandle;
