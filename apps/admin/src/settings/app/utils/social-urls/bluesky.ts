import {createPlatformValidator} from './platform-validator';

// Bluesky profile identifiers come in three shapes; all are stored bare.
const BLUESKY_USERNAME_PATTERNS = [
    // DID: did:plc: + 24-character Base32 identifier (lowercase a–z, digits 2–7)
    /^did:plc:[a-z2-7]{24}$/,
    // short username: max 15 chars
    /^[a-zA-Z0-9._]{1,15}$/,
    // domain handle: requires a dot, max 191 chars
    // (the lookahead does the length check because + is unbounded)
    /^(?=.{1,191}$)[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/
];

const bluesky = createPlatformValidator({
    domains: ['bsky.app'],
    www: false,
    pathTypes: [
        // bsky.app/profile/@username is a common paste (users type Bluesky
        // handles with a leading @ out of habit); the @ is decorative here,
        // not a marker for a competing path type, so it's still stripped
        {urlPrefix: 'profile/', storagePrefix: '', tolerateLeadingAt: true, rule: {patterns: BLUESKY_USERNAME_PATTERNS}}
    ],
    // DIDs are case-insensitive identifiers, canonically lowercase
    transformUsername: username => (/^did:plc:/i.test(username) ? username.toLowerCase() : username),
    errors: {
        invalidUrl: 'The URL must be in a format like https://bsky.app/profile/yourUsername',
        invalidUsername: 'Your Username is not a valid Bluesky Username'
    }
});

export const validateBlueskyUrl = bluesky.validate;
export const blueskyHandleToUrl = bluesky.handleToUrl;
export const blueskyUrlToHandle = bluesky.urlToHandle;
