import * as assert from 'assert/strict';
import {
    blueskyHandleToUrl, blueskyUrlToHandle,
    facebookHandleToUrl, facebookUrlToHandle,
    instagramHandleToUrl, instagramUrlToHandle,
    linkedinHandleToUrl, linkedinUrlToHandle,
    mastodonHandleToUrl, mastodonUrlToHandle,
    sanitiseMastodonUrl,
    threadsHandleToUrl, threadsUrlToHandle,
    tiktokHandleToUrl, tiktokUrlToHandle,
    twitterHandleToUrl, twitterUrlToHandle,
    validateBlueskyUrl,
    validateFacebookUrl,
    validateInstagramUrl,
    validateLinkedInUrl,
    validateMastodonUrl,
    validateThreadsUrl,
    validateTikTokUrl,
    validateTwitterUrl,
    validateYouTubeUrl,
    youtubeHandleToUrl, youtubeUrlToHandle
} from '../../../src/utils/social-urls/index';

/*
 * Table-driven coverage for every social platform validator.
 *
 * Each platform declares its known-valid and known-invalid inputs; the suite
 * additionally runs three round-trip invariants over EVERY valid case:
 *
 *   1. validate is idempotent: validate(validate(x)) === validate(x)
 *   2. every canonical URL yields a stored handle: urlToHandle(url) !== null
 *   3. the stored handle is stable: rebuilding the URL from the handle gives a
 *      canonical URL that maps back to the same handle
 *
 * To extend coverage for a platform, add a row to its fixture — the invariants
 * apply automatically.
 */

type PlatformFixture = {
    platform: string;
    validate: (input: string) => string;
    handleToUrl: (handle: string) => string;
    urlToHandle: (url: string) => string | null;
    /** user input (URL or handle) → canonical URL returned by validate() */
    valid: Array<[input: string, expected: string]>;
    /** user input → thrown error */
    invalid: Array<[input: string, error: RegExp]>;
    /** stored handle → canonical URL returned by handleToUrl() */
    handles: Array<[handle: string, expected: string]>;
    /** stored handle → thrown error */
    invalidHandles: Array<[handle: string, error: RegExp]>;
    /** URL → stored handle returned by urlToHandle(), null when not a valid profile URL */
    urlHandles: Array<[url: string, expected: string | null]>;
};

const TWITTER_URL_ERROR = /The URL must be in a format like https:\/\/x\.com\/yourUsername/;
const TWITTER_USERNAME_ERROR = /Your Username is not a valid Twitter Username/;
const FACEBOOK_ERROR = /The URL must be in a format like https:\/\/www\.facebook\.com\/yourPage/;
const INSTAGRAM_URL_ERROR = /The URL must be in a format like https:\/\/www\.instagram\.com\/yourUsername/;
const INSTAGRAM_USERNAME_ERROR = /Your Username is not a valid Instagram Username/;
const TIKTOK_URL_ERROR = /The URL must be in a format like https:\/\/www\.tiktok\.com\/@yourUsername/;
const TIKTOK_USERNAME_ERROR = /Your Username is not a valid TikTok Username/;
const THREADS_ERROR = /The URL must be in a format like https:\/\/www\.threads\.net\/@yourUsername/;
const YOUTUBE_URL_ERROR = /The URL must be in a format like https:\/\/www\.youtube\.com\/@yourUsername, https:\/\/www\.youtube\.com\/user\/yourUsername, or https:\/\/www\.youtube\.com\/channel\/yourChannelId/;
const YOUTUBE_USERNAME_ERROR = /Your Username is not a valid YouTube Username/;
const LINKEDIN_URL_ERROR = /The URL must be in a format like https:\/\/www\.linkedin\.com\/in\/yourUsername/;
const LINKEDIN_USERNAME_ERROR = /Your Username is not a valid LinkedIn Username/;
const BLUESKY_URL_ERROR = /The URL must be in a format like https:\/\/bsky\.app\/profile\/yourUsername/;
const BLUESKY_USERNAME_ERROR = /Your Username is not a valid Bluesky Username/;
const MASTODON_URL_ERROR = /The URL must be in a format like @username@instance\.tld or https:\/\/instance\.tld\/@username or https:\/\/website\.com\/@username@instance\.tld/;
const MASTODON_USERNAME_ERROR = /Your Username is not a valid Mastodon Username/;

const FIXTURES: PlatformFixture[] = [
    {
        platform: 'X (Twitter)',
        validate: validateTwitterUrl,
        handleToUrl: twitterHandleToUrl,
        urlToHandle: twitterUrlToHandle,
        valid: [
            ['x.com/username', 'https://x.com/username'],
            ['https://x.com/username', 'https://x.com/username'],
            ['https://www.x.com/username', 'https://x.com/username'],
            ['twitter.com/username', 'https://x.com/username'],
            ['https://twitter.com/username', 'https://x.com/username'],
            ['X.com/username', 'https://x.com/username'],
            ['https://x.com/@ghost', 'https://x.com/ghost'],
            ['@username', 'https://x.com/username'],
            ['username', 'https://x.com/username'],
            ['user_name', 'https://x.com/user_name'],
            // handles that merely start with 'www'/'http' are usernames, not URLs
            ['wwwUsername', 'https://x.com/wwwUsername'],
            ['httpUsername', 'https://x.com/httpUsername']
        ],
        invalid: [
            ['x.com/username@', TWITTER_USERNAME_ERROR],
            ['x.com/username!', TWITTER_USERNAME_ERROR],
            ['x.com/user.name', TWITTER_USERNAME_ERROR], // dots are not allowed on X
            ['x.com/thisusernameistoolong', TWITTER_USERNAME_ERROR], // > 15 chars
            ['x.com/with\nnewline', TWITTER_USERNAME_ERROR],
            ['x.com/username?foo=1', TWITTER_USERNAME_ERROR],
            ['@@ghost', TWITTER_USERNAME_ERROR], // doubled @ is not a valid marker + username
            ['x.com/@@ghost', TWITTER_USERNAME_ERROR],
            ['x.com/username#fragment', TWITTER_USERNAME_ERROR],
            ['*(&*(%%))', TWITTER_USERNAME_ERROR],
            ['https://github.com/username', TWITTER_URL_ERROR],
            ['http://example.com', TWITTER_URL_ERROR]
        ],
        handles: [
            ['@username', 'https://x.com/username'],
            ['username', 'https://x.com/username']
        ],
        invalidHandles: [
            ['user.name', TWITTER_USERNAME_ERROR],
            ['@toolongusernameforx', TWITTER_USERNAME_ERROR],
            ['@@ghost', TWITTER_USERNAME_ERROR]
        ],
        urlHandles: [
            ['https://x.com/username', '@username'],
            ['https://x.com/@username', '@username'],
            ['x.com/username', '@username'],
            ['https://twitter.com/username', '@username'],
            ['https://x.com/user.name', null], // invalid username
            ['https://github.com/username', null],
            ['invalid-url', null]
        ]
    },
    {
        platform: 'Facebook',
        validate: validateFacebookUrl,
        handleToUrl: facebookHandleToUrl,
        urlToHandle: facebookUrlToHandle,
        valid: [
            ['facebook.com/myPage', 'https://www.facebook.com/myPage'],
            ['https://www.facebook.com/myPage', 'https://www.facebook.com/myPage'],
            ['www.facebook.com/myPage', 'https://www.facebook.com/myPage'],
            ['facebook.com/myPage/', 'https://www.facebook.com/myPage'],
            ['/myPage', 'https://www.facebook.com/myPage'],
            ['myPage', 'https://www.facebook.com/myPage'],
            ['ab99', 'https://www.facebook.com/ab99'],
            // facebook is deliberately loose: nested paths, odd characters and
            // query strings are all real page locations
            ['page/ab99', 'https://www.facebook.com/page/ab99'],
            ['page/*(&*(%%))', 'https://www.facebook.com/page/*(&*(%%))'],
            ['facebook.com/pages/some-facebook-page/857469375913?ref=ts', 'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts'],
            ['https://www.facebook.com/groups/savethecrowninn', 'https://www.facebook.com/groups/savethecrowninn'],
            ['facebook.com/profile.php?id=100086939887650', 'https://www.facebook.com/profile.php?id=100086939887650']
        ],
        invalid: [
            ['https://twitter.com/myPage', FACEBOOK_ERROR],
            ['http://example.com', FACEBOOK_ERROR],
            ['http://github.com/username', FACEBOOK_ERROR],
            ['http://github.com/pages/username', FACEBOOK_ERROR],
            ['facebook.com/my\nPage', FACEBOOK_ERROR]
        ],
        handles: [
            ['myPage', 'https://www.facebook.com/myPage'],
            ['groups/savethecrowninn', 'https://www.facebook.com/groups/savethecrowninn'],
            ['pages/some-facebook-page/857469375913?ref=ts', 'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts']
        ],
        invalidHandles: [
            ['my page', FACEBOOK_ERROR]
        ],
        urlHandles: [
            ['https://www.facebook.com/myPage', 'myPage'],
            ['https://www.facebook.com/myPage/', 'myPage'],
            ['facebook.com/myPage', 'myPage'],
            ['facebook.com/my\nPage', null],
            ['invalid-url', null]
        ]
    },
    {
        platform: 'Instagram',
        validate: validateInstagramUrl,
        handleToUrl: instagramHandleToUrl,
        urlToHandle: instagramUrlToHandle,
        valid: [
            ['instagram.com/johnsmith', 'https://www.instagram.com/johnsmith'],
            ['https://www.instagram.com/johnsmith', 'https://www.instagram.com/johnsmith'],
            ['www.instagram.com/john.smith', 'https://www.instagram.com/john.smith'],
            ['instagram.com/john_smith_123', 'https://www.instagram.com/john_smith_123'],
            ['instagram.com/@johnsmith', 'https://www.instagram.com/johnsmith'],
            ['@johnsmith', 'https://www.instagram.com/johnsmith'],
            ['johnsmith', 'https://www.instagram.com/johnsmith'],
            ['_john_smith_', 'https://www.instagram.com/_john_smith_'],
            ['j', 'https://www.instagram.com/j'], // single-character usernames exist
            // a URL to specific content under a profile still resolves to
            // that profile — only the first path segment is the username
            ['instagram.com/johnsmith/reels/', 'https://www.instagram.com/johnsmith'],
            // a mobile/alternate subdomain paste is still a valid profile URL
            ['https://m.instagram.com/johnsmith', 'https://www.instagram.com/johnsmith']
        ],
        invalid: [
            ['https://twitter.com/johnsmith', INSTAGRAM_URL_ERROR],
            ['http://example.com', INSTAGRAM_URL_ERROR],
            ['instagram.com/john-smith', INSTAGRAM_USERNAME_ERROR], // hyphen not allowed
            ['instagram.com/john@smith', INSTAGRAM_USERNAME_ERROR],
            ['instagram.com/.johnsmith', INSTAGRAM_USERNAME_ERROR], // leading period
            ['instagram.com/johnsmith.', INSTAGRAM_USERNAME_ERROR], // trailing period
            ['instagram.com/john..smith', INSTAGRAM_USERNAME_ERROR], // consecutive periods
            ['instagram.com/' + 'a'.repeat(31), INSTAGRAM_USERNAME_ERROR], // too long
            ['instagram.com/john%20smith', INSTAGRAM_USERNAME_ERROR], // percent-encoded space
            ['instagram.com/johnsmith?hl=en', INSTAGRAM_USERNAME_ERROR]
        ],
        handles: [
            ['johnsmith', 'https://www.instagram.com/johnsmith'],
            ['@johnsmith', 'https://www.instagram.com/johnsmith'],
            ['john.smith', 'https://www.instagram.com/john.smith'],
            ['_john_smith_123_', 'https://www.instagram.com/_john_smith_123_']
        ],
        invalidHandles: [
            ['john-smith', INSTAGRAM_USERNAME_ERROR],
            ['john@smith', INSTAGRAM_USERNAME_ERROR],
            ['.johnsmith', INSTAGRAM_USERNAME_ERROR],
            ['johnsmith.', INSTAGRAM_USERNAME_ERROR],
            ['john..smith', INSTAGRAM_USERNAME_ERROR],
            ['a'.repeat(31), INSTAGRAM_USERNAME_ERROR]
        ],
        urlHandles: [
            ['https://www.instagram.com/johnsmith', 'johnsmith'],
            ['instagram.com/john.smith', 'john.smith'],
            ['www.instagram.com/john_smith_123', 'john_smith_123'],
            ['https://example.com/johnsmith', null],
            ['invalid-url', null]
        ]
    },
    {
        platform: 'TikTok',
        validate: validateTikTokUrl,
        handleToUrl: tiktokHandleToUrl,
        urlToHandle: tiktokUrlToHandle,
        valid: [
            ['tiktok.com/@johnsmith', 'https://www.tiktok.com/@johnsmith'],
            ['https://www.tiktok.com/@johnsmith', 'https://www.tiktok.com/@johnsmith'],
            ['www.tiktok.com/@john.smith', 'https://www.tiktok.com/@john.smith'],
            ['tiktok.com/@john_smith123', 'https://www.tiktok.com/@john_smith123'],
            ['tiktok.com/@johnsmith/', 'https://www.tiktok.com/@johnsmith'],
            ['@johnsmith', 'https://www.tiktok.com/@johnsmith'],
            ['johnsmith', 'https://www.tiktok.com/@johnsmith'],
            ['_john_smith_', 'https://www.tiktok.com/@_john_smith_'],
            // a URL to a specific video still resolves to the profile
            ['tiktok.com/@johnsmith/video/1234567890123456789', 'https://www.tiktok.com/@johnsmith']
        ],
        invalid: [
            ['https://twitter.com/@johnsmith', TIKTOK_URL_ERROR],
            ['http://example.com', TIKTOK_URL_ERROR],
            ['tiktok.com/johnsmith', TIKTOK_URL_ERROR], // the @ is required in tiktok URLs
            ['tiktok.com/@john-smith', TIKTOK_USERNAME_ERROR], // hyphen not allowed
            ['tiktok.com/@john@smith', TIKTOK_USERNAME_ERROR],
            ['tiktok.com/@.johnsmith', TIKTOK_USERNAME_ERROR], // leading period
            ['tiktok.com/@john..smith', TIKTOK_USERNAME_ERROR], // consecutive periods
            ['tiktok.com/@j', TIKTOK_USERNAME_ERROR], // too short
            ['tiktok.com/@' + 'a'.repeat(25), TIKTOK_USERNAME_ERROR], // too long
            ['tiktok.com/@johnsmith?lang=en', TIKTOK_USERNAME_ERROR],
            ['@@ghost', TIKTOK_USERNAME_ERROR], // doubled @ is not a valid marker + username
            ['tiktok.com/@@ghost', TIKTOK_USERNAME_ERROR]
        ],
        handles: [
            ['johnsmith', 'https://www.tiktok.com/@johnsmith'],
            ['@johnsmith', 'https://www.tiktok.com/@johnsmith'],
            ['john.smith', 'https://www.tiktok.com/@john.smith'],
            ['_john_smith123_', 'https://www.tiktok.com/@_john_smith123_']
        ],
        invalidHandles: [
            ['john-smith', TIKTOK_USERNAME_ERROR],
            ['john@smith', TIKTOK_USERNAME_ERROR],
            ['.johnsmith', TIKTOK_USERNAME_ERROR],
            ['john..smith', TIKTOK_USERNAME_ERROR],
            ['j', TIKTOK_USERNAME_ERROR],
            ['a'.repeat(25), TIKTOK_USERNAME_ERROR],
            ['@@ghost', TIKTOK_USERNAME_ERROR]
        ],
        urlHandles: [
            ['https://www.tiktok.com/@johnsmith', '@johnsmith'],
            ['https://www.tiktok.com/@john.smith', '@john.smith'],
            ['tiktok.com/@_john_smith123_', '@_john_smith123_'],
            ['www.tiktok.com/@johnsmith', '@johnsmith'],
            ['https://www.tiktok.com/@john..smith', null], // invalid username
            ['https://example.com/@johnsmith', null],
            ['invalid-url', null]
        ]
    },
    {
        platform: 'Threads',
        validate: validateThreadsUrl,
        handleToUrl: threadsHandleToUrl,
        urlToHandle: threadsUrlToHandle,
        valid: [
            ['@example123', 'https://www.threads.net/@example123'],
            ['example123', 'https://www.threads.net/@example123'],
            ['https://www.threads.net/@example123', 'https://www.threads.net/@example123'],
            ['https://www.threads.com/@example123', 'https://www.threads.net/@example123'],
            ['https://threads.net/@example123', 'https://www.threads.net/@example123'],
            ['threads.net/@example123', 'https://www.threads.net/@example123'],
            // /username without the @ also resolves on threads.net
            ['https://www.threads.net/example123', 'https://www.threads.net/example123'],
            ['@example.123', 'https://www.threads.net/@example.123'],
            // a handle containing the platform's own domain as a substring
            // (not anchored at the start) must not be misrouted into URL parsing
            ['mythreads.net', 'https://www.threads.net/@mythreads.net'],
            // a mobile/alternate subdomain paste is still a valid profile URL
            ['https://m.threads.net/@example123', 'https://www.threads.net/@example123']
        ],
        invalid: [
            ['https://www.notthreads.com', THREADS_ERROR],
            ['https://www.threeeds.com/example123', THREADS_ERROR],
            // threads usernames are instagram usernames, so instagram's rules apply
            ['threads.net/@ex..ample', THREADS_ERROR],
            ['threads.net/@example123.', THREADS_ERROR],
            ['threads.net/@' + 'a'.repeat(31), THREADS_ERROR],
            ['@@example123', THREADS_ERROR], // doubled @ is not a valid marker + username
            ['threads.net/@@example123', THREADS_ERROR]
        ],
        handles: [
            ['@example123', 'https://www.threads.net/@example123'],
            ['example123', 'https://www.threads.net/@example123']
        ],
        invalidHandles: [
            ['@ex..ample', THREADS_ERROR],
            ['@example123.', THREADS_ERROR],
            ['@@example123', THREADS_ERROR]
        ],
        urlHandles: [
            ['https://www.threads.net/@example123', '@example123'],
            ['https://threads.net/@example123', '@example123'],
            ['https://www.threads.net/example123', '@example123'],
            ['https://www.threads.com/@example123', '@example123'],
            ['invalid-url', null]
        ]
    },
    {
        platform: 'YouTube',
        validate: validateYouTubeUrl,
        handleToUrl: youtubeHandleToUrl,
        urlToHandle: youtubeUrlToHandle,
        valid: [
            ['youtube.com/@johnsmith', 'https://www.youtube.com/@johnsmith'],
            ['https://www.youtube.com/@john.smith', 'https://www.youtube.com/@john.smith'],
            ['www.youtube.com/user/johnsmith', 'https://www.youtube.com/user/johnsmith'],
            ['youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A', 'https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A'],
            ['@johnsmith', 'https://www.youtube.com/@johnsmith'],
            ['johnsmith', 'https://www.youtube.com/@johnsmith'], // bare input defaults to an @handle
            ['user/johnsmith', 'https://www.youtube.com/user/johnsmith'],
            ['channel/UC4QobU6STFB0P71PMvOGN5A', 'https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A'],
            // handles support non-Latin scripts
            ['youtube.com/@日本語ハンドル', 'https://www.youtube.com/@日本語ハンドル'],
            ['youtube.com/@%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%83%8F%E3%83%B3%E3%83%89%E3%83%AB', 'https://www.youtube.com/@日本語ハンドル'],
            // a URL to a specific video still resolves to the channel
            ['youtube.com/@johnsmith/videos', 'https://www.youtube.com/@johnsmith'],
            // a mobile/alternate subdomain paste is still a valid profile URL
            ['https://m.youtube.com/@johnsmith', 'https://www.youtube.com/@johnsmith'],
            ['https://music.youtube.com/@johnsmith', 'https://www.youtube.com/@johnsmith']
        ],
        invalid: [
            ['https://twitter.com/@johnsmith', YOUTUBE_URL_ERROR],
            ['http://example.com', YOUTUBE_URL_ERROR],
            ['youtube.com/c/johnsmith', YOUTUBE_URL_ERROR], // deprecated /c/ format
            ['youtube.com/@john..smith', YOUTUBE_USERNAME_ERROR], // consecutive periods
            ['youtube.com/@_johnsmith', YOUTUBE_USERNAME_ERROR], // boundary punctuation
            ['youtube.com/@johnsmith-', YOUTUBE_USERNAME_ERROR],
            ['youtube.com/@jo', YOUTUBE_USERNAME_ERROR], // too short
            ['youtube.com/@' + 'a'.repeat(31), YOUTUBE_USERNAME_ERROR], // too long
            ['youtube.com/user/john@smith', YOUTUBE_USERNAME_ERROR],
            ['youtube.com/user/' + 'a'.repeat(51), YOUTUBE_USERNAME_ERROR],
            ['youtube.com/channel/UC123', YOUTUBE_USERNAME_ERROR], // malformed channel ID
            ['@@johnsmith', YOUTUBE_USERNAME_ERROR], // doubled @ is not a valid marker + username
            ['youtube.com/@@johnsmith', YOUTUBE_USERNAME_ERROR],
            // a leftover '@' after the 'user/' prefix mixes two incompatible
            // URL conventions and is rejected, not silently stripped
            ['youtube.com/user/@johnsmith', YOUTUBE_USERNAME_ERROR]
        ],
        handles: [
            ['@johnsmith', 'https://www.youtube.com/@johnsmith'],
            ['johnsmith', 'https://www.youtube.com/@johnsmith'],
            ['user/johnsmith', 'https://www.youtube.com/user/johnsmith'],
            ['channel/UC4QobU6STFB0P71PMvOGN5A', 'https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A'],
            ['@john.smith', 'https://www.youtube.com/@john.smith']
        ],
        invalidHandles: [
            ['@john..smith', YOUTUBE_USERNAME_ERROR],
            ['@jo', YOUTUBE_USERNAME_ERROR],
            ['@' + 'a'.repeat(31), YOUTUBE_USERNAME_ERROR],
            ['user/john@smith', YOUTUBE_USERNAME_ERROR],
            ['user/' + 'a'.repeat(51), YOUTUBE_USERNAME_ERROR],
            ['channel/UC123', YOUTUBE_USERNAME_ERROR],
            ['@@johnsmith', YOUTUBE_USERNAME_ERROR],
            ['user/@johnsmith', YOUTUBE_USERNAME_ERROR]
        ],
        urlHandles: [
            ['https://www.youtube.com/@johnsmith', '@johnsmith'],
            ['https://www.youtube.com/@john.smith', '@john.smith'],
            ['youtube.com/user/johnsmith', 'user/johnsmith'],
            ['www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A', 'channel/UC4QobU6STFB0P71PMvOGN5A'],
            ['youtube.com/c/johnsmith', null], // deprecated format
            ['https://example.com/@johnsmith', null],
            ['invalid-url', null]
        ]
    },
    {
        platform: 'LinkedIn',
        validate: validateLinkedInUrl,
        handleToUrl: linkedinHandleToUrl,
        urlToHandle: linkedinUrlToHandle,
        valid: [
            ['linkedin.com/in/johnsmith', 'https://www.linkedin.com/in/johnsmith'],
            ['https://www.linkedin.com/in/johnsmith', 'https://www.linkedin.com/in/johnsmith'],
            ['https://www.linkedin.com/in/johnsmith/', 'https://www.linkedin.com/in/johnsmith'],
            ['ca.linkedin.com/in/john-smith', 'https://ca.linkedin.com/in/john-smith'],
            ['linkedin.com/pub/john-smith-abc123', 'https://www.linkedin.com/pub/john-smith-abc123'],
            ['linkedin.com/pub/johnsmith/12/34/567', 'https://www.linkedin.com/pub/johnsmith/12/34/567'],
            ['linkedin.com/company/ghost-foundation', 'https://www.linkedin.com/company/ghost-foundation'],
            ['https://www.linkedin.com/company/ghost-foundation/', 'https://www.linkedin.com/company/ghost-foundation'],
            ['linkedin.com/school/mit', 'https://www.linkedin.com/school/mit'],
            ['company/ghost-foundation', 'https://www.linkedin.com/company/ghost-foundation'],
            ['school/mit', 'https://www.linkedin.com/school/mit'],
            ['in/johnsmith', 'https://www.linkedin.com/in/johnsmith'],
            ['@johnsmith', 'https://www.linkedin.com/in/johnsmith'],
            ['johnsmith', 'https://www.linkedin.com/in/johnsmith'],
            // international characters (ONC-1856): both the readable and the
            // percent-encoded form of the same URL are accepted and stored decoded
            ['https://www.linkedin.com/company/la-revue-européenne-des-médias-et-du-numérique/', 'https://www.linkedin.com/company/la-revue-européenne-des-médias-et-du-numérique'],
            ['https://www.linkedin.com/company/la-revue-europ%C3%A9enne-des-m%C3%A9dias-et-du-num%C3%A9rique/', 'https://www.linkedin.com/company/la-revue-européenne-des-médias-et-du-numérique'],
            ['linkedin.com/in/józsef-kovács', 'https://www.linkedin.com/in/józsef-kovács'],
            ['linkedin.com/in/山田太郎', 'https://www.linkedin.com/in/山田太郎'],
            // decomposed accents (e + combining acute) normalise to composed form
            ['linkedin.com/in/josé-garcia', 'https://www.linkedin.com/in/josé-garcia']
        ],
        invalid: [
            ['https://twitter.com/johnsmith', LINKEDIN_URL_ERROR],
            ['http://example.com', LINKEDIN_URL_ERROR],
            ['linkedin.com/in/john@smith', LINKEDIN_USERNAME_ERROR],
            ['linkedin.com/in/john#smith', LINKEDIN_USERNAME_ERROR],
            ['linkedin.com/in/' + 'a'.repeat(101), LINKEDIN_USERNAME_ERROR], // too long
            ['linkedin.com/in/johnsmith#fragment', LINKEDIN_USERNAME_ERROR],
            ['linkedin.com/in/johnsmith?foo=1', LINKEDIN_USERNAME_ERROR],
            ['linkedin.com/in/john%20smith', LINKEDIN_USERNAME_ERROR], // percent-encoded space
            ['linkedin.com/in/john%3Fsmith', LINKEDIN_USERNAME_ERROR], // percent-encoded ?
            ['linkedin.com/in/john%2smith', LINKEDIN_USERNAME_ERROR], // malformed percent-encoding
            // a leftover '@' after the 'company/' prefix mixes two
            // incompatible URL conventions and is rejected, not silently stripped
            ['linkedin.com/company/@acme', LINKEDIN_USERNAME_ERROR]
        ],
        handles: [
            ['johnsmith', 'https://www.linkedin.com/in/johnsmith'],
            ['@johnsmith', 'https://www.linkedin.com/in/johnsmith'],
            ['john-smith', 'https://www.linkedin.com/in/john-smith'],
            ['johnsmith/', 'https://www.linkedin.com/in/johnsmith'],
            ['in/johnsmith', 'https://www.linkedin.com/in/johnsmith'],
            ['company/ghost-foundation', 'https://www.linkedin.com/company/ghost-foundation'],
            ['company/ghost-foundation/', 'https://www.linkedin.com/company/ghost-foundation'],
            ['pub/johnsmith/12/34/567', 'https://www.linkedin.com/pub/johnsmith/12/34/567'],
            ['company/la-revue-européenne-des-médias-et-du-numérique', 'https://www.linkedin.com/company/la-revue-européenne-des-médias-et-du-numérique']
        ],
        invalidHandles: [
            ['john@smith', LINKEDIN_USERNAME_ERROR],
            ['john#smith', LINKEDIN_USERNAME_ERROR],
            ['john.smith', LINKEDIN_USERNAME_ERROR], // dots are not allowed on linkedin
            ['jo', LINKEDIN_USERNAME_ERROR], // too short
            ['a'.repeat(101), LINKEDIN_USERNAME_ERROR], // too long
            ['company/@acme', LINKEDIN_USERNAME_ERROR]
        ],
        urlHandles: [
            ['https://www.linkedin.com/in/johnsmith', 'johnsmith'],
            ['https://www.linkedin.com/in/johnsmith/', 'johnsmith'],
            // a redundant '@' after the 'in/' prefix is rejected, not silently
            // stripped, consistent with company/@acme and youtube.com/user/@x
            // (the pre-consolidation code stripped this inconsistently — only
            // in the URL-form branch, never in the handle-form branch)
            ['https://www.linkedin.com/in/@johnsmith', null],
            ['linkedin.com/in/johnsmith', 'johnsmith'],
            ['ca.linkedin.com/in/john-smith', 'john-smith'], // regional subdomain is dropped in storage
            ['linkedin.com/pub/john-smith-abc123', 'pub/john-smith-abc123'],
            ['linkedin.com/pub/johnsmith/12/34/567', 'pub/johnsmith/12/34/567'],
            ['https://www.linkedin.com/company/ghost-foundation', 'company/ghost-foundation'],
            ['https://www.linkedin.com/company/ghost-foundation/', 'company/ghost-foundation'],
            ['linkedin.com/school/mit', 'school/mit'],
            ['https://www.linkedin.com/company/la-revue-europ%C3%A9enne-des-m%C3%A9dias-et-du-num%C3%A9rique/', 'company/la-revue-européenne-des-médias-et-du-numérique'],
            ['https://www.linkedin.com/company/la-revue-européenne-des-médias-et-du-numérique/', 'company/la-revue-européenne-des-médias-et-du-numérique'],
            ['https://example.com/johnsmith', null],
            ['invalid-url', null]
        ]
    },
    {
        platform: 'Bluesky',
        validate: validateBlueskyUrl,
        handleToUrl: blueskyHandleToUrl,
        urlToHandle: blueskyUrlToHandle,
        valid: [
            ['bsky.app/profile/username', 'https://bsky.app/profile/username'],
            ['https://bsky.app/profile/username', 'https://bsky.app/profile/username'],
            ['www.bsky.app/profile/username', 'https://bsky.app/profile/username'],
            ['www.bsky.app/profile/did:plc:g67wcylkodj4rrrgh26eifkq', 'https://bsky.app/profile/did:plc:g67wcylkodj4rrrgh26eifkq'],
            ['did:plc:g67wcylkodj4rrrgh26eifkq', 'https://bsky.app/profile/did:plc:g67wcylkodj4rrrgh26eifkq'],
            ['did:plc:THISWILLBELOWERCASED4567', 'https://bsky.app/profile/did:plc:thiswillbelowercased4567'],
            // DID prefix matching is case-insensitive, so an all-caps DID is
            // still recognised and lowercased in full, not left partially-cased
            ['DID:PLC:G67WCYLKODJ4RRRGH26EIFKQ', 'https://bsky.app/profile/did:plc:g67wcylkodj4rrrgh26eifkq'],
            ['@username', 'https://bsky.app/profile/username'],
            ['username', 'https://bsky.app/profile/username'],
            // domain handles have no 15-char limit
            ['thisusernameistoolongforblueskybutisadomain.com', 'https://bsky.app/profile/thisusernameistoolongforblueskybutisadomain.com'],
            ['ghost.bsky.social', 'https://bsky.app/profile/ghost.bsky.social'],
            // a domain handle containing the platform's own domain as a
            // substring (not anchored at the start) must not be misrouted into
            // URL parsing, where it would be rejected as a malformed URL
            ['mybsky.app', 'https://bsky.app/profile/mybsky.app'],
            // a decorative '@' after 'profile/' is still tolerated and
            // stripped (tolerateLeadingAt) — unlike YouTube's user/ or
            // LinkedIn's company/, Bluesky has no competing '@'-marked path
            // type, so this isn't a mixed-convention input
            ['bsky.app/profile/@username', 'https://bsky.app/profile/username'],
            // a URL to a specific post still resolves to the profile
            ['bsky.app/profile/username/post/abc123', 'https://bsky.app/profile/username']
        ],
        invalid: [
            ['https://twitter.com/username', BLUESKY_URL_ERROR],
            ['http://example.com', BLUESKY_URL_ERROR],
            ['bsky.app/profile/username@', BLUESKY_USERNAME_ERROR],
            ['bsky.app/profile/username!', BLUESKY_USERNAME_ERROR],
            ['bsky.app/profile/did:plc:thisisnotavalidformat', BLUESKY_USERNAME_ERROR],
            ['bsky.app/profile/thisusernameistoolongforbluesky', BLUESKY_USERNAME_ERROR],
            ['bsky.app/profile/username?tab=posts', BLUESKY_USERNAME_ERROR]
        ],
        handles: [
            ['username', 'https://bsky.app/profile/username'],
            ['@username', 'https://bsky.app/profile/username'],
            ['did:plc:g67wcylkodj4rrrgh26eifkq', 'https://bsky.app/profile/did:plc:g67wcylkodj4rrrgh26eifkq'],
            ['ghost.bsky.social', 'https://bsky.app/profile/ghost.bsky.social']
        ],
        invalidHandles: [
            ['username@', BLUESKY_USERNAME_ERROR],
            ['username!', BLUESKY_USERNAME_ERROR],
            ['thisusernameistoolongforbluesky', BLUESKY_USERNAME_ERROR]
        ],
        urlHandles: [
            ['https://bsky.app/profile/username', 'username'],
            ['https://bsky.app/profile/@username', 'username'],
            ['bsky.app/profile/username', 'username'],
            ['bsky.app/profile/did:plc:g67wcylkodj4rrrgh26eifkq', 'did:plc:g67wcylkodj4rrrgh26eifkq'],
            ['https://example.com/username', null],
            ['invalid-url', null]
        ]
    },
    {
        platform: 'Mastodon',
        validate: validateMastodonUrl,
        handleToUrl: mastodonHandleToUrl,
        urlToHandle: mastodonUrlToHandle,
        valid: [
            ['@example@indieweb.social', 'https://indieweb.social/@example'],
            ['@johnsmith@mastodon.social', 'https://mastodon.social/@johnsmith'],
            ['@user123@sub.mastodon.cloud', 'https://sub.mastodon.cloud/@user123'],
            ['indieweb.social/@example', 'https://indieweb.social/@example'],
            ['mastodon.social/@johnsmith', 'https://mastodon.social/@johnsmith'],
            ['sub.mastodon.cloud/@user123', 'https://sub.mastodon.cloud/@user123'],
            ['mastodon.xyz/@Flipboard@flipboard.social', 'https://mastodon.xyz/@Flipboard@flipboard.social'],
            ['mastodon.social/@user@other.instance', 'https://mastodon.social/@user@other.instance']
        ],
        invalid: [
            ['example.com/johnsmith', MASTODON_URL_ERROR],
            ['invalid/@johnsmith', MASTODON_URL_ERROR],
            ['@johnsmith', MASTODON_URL_ERROR]
        ],
        handles: [
            ['@example@indieweb.social', 'https://indieweb.social/@example'],
            ['@johnsmith@mastodon.social', 'https://mastodon.social/@johnsmith'],
            ['@user123@sub.mastodon.cloud', 'https://sub.mastodon.cloud/@user123'],
            ['indieweb.social/@example', 'https://indieweb.social/@example'],
            ['mastodon.social/@example', 'https://mastodon.social/@example'],
            ['sub.mastodon.cloud/@user123', 'https://sub.mastodon.cloud/@user123'],
            ['mastodon.xyz/@Flipboard@flipboard.social', 'https://mastodon.xyz/@Flipboard@flipboard.social'],
            ['mastodon.social/@user@other.instance', 'https://mastodon.social/@user@other.instance']
        ],
        invalidHandles: [
            ['invalid/@johnsmith', MASTODON_USERNAME_ERROR],
            ['example.com/johnsmith', MASTODON_USERNAME_ERROR],
            ['@johnsmith', MASTODON_USERNAME_ERROR]
        ],
        urlHandles: [
            ['https://mastodon.xyz/@Flipboard@flipboard.social', 'mastodon.xyz/@Flipboard@flipboard.social'],
            ['https://mastodon.social/@user@other.instance', 'mastodon.social/@user@other.instance'],
            ['https://indieweb.social/@example', '@example@indieweb.social'],
            ['https://mastodon.social/@example', '@example@mastodon.social'],
            ['https://sub.mastodon.cloud/@user123', '@user123@sub.mastodon.cloud'],
            ['invalid-url', null],
            ['mastodon.social/johnsmith', null],
            ['invalid/@johnsmith', null],
            ['@johnsmith', null]
        ]
    }
];

FIXTURES.forEach(({platform, validate, handleToUrl, urlToHandle, valid, invalid, handles, invalidHandles, urlHandles}) => {
    describe(`${platform} URLs`, () => {
        it('returns an empty string for empty input', () => {
            assert.equal(validate(''), '');
        });

        it('throws for an empty handle', () => {
            assert.throws(() => handleToUrl(''));
        });

        it('returns null for an empty or non-URL input to urlToHandle', () => {
            assert.equal(urlToHandle(''), null);
        });

        it('normalises valid input to a canonical URL', () => {
            for (const [input, expected] of valid) {
                assert.equal(validate(input), expected, `input: ${JSON.stringify(input)}`);
            }
        });

        it('rejects invalid input', () => {
            for (const [input, error] of invalid) {
                assert.throws(() => validate(input), error, `input: ${JSON.stringify(input)}`);
            }
        });

        it('converts stored handles to canonical URLs', () => {
            for (const [handle, expected] of handles) {
                assert.equal(handleToUrl(handle), expected, `handle: ${JSON.stringify(handle)}`);
            }
        });

        it('rejects invalid handles', () => {
            for (const [handle, error] of invalidHandles) {
                assert.throws(() => handleToUrl(handle), error, `handle: ${JSON.stringify(handle)}`);
            }
        });

        it('extracts stored handles from URLs', () => {
            for (const [url, expected] of urlHandles) {
                assert.equal(urlToHandle(url), expected, `url: ${JSON.stringify(url)}`);
            }
        });

        // the properties below run over every valid case, so any row added to
        // the fixture is automatically checked for display/storage consistency

        it('validate is idempotent on its own output', () => {
            for (const [input] of valid) {
                const canonical = validate(input);
                assert.equal(validate(canonical), canonical, `input: ${JSON.stringify(input)}`);
            }
        });

        it('every canonical URL yields a stored handle', () => {
            for (const [input] of valid) {
                const canonical = validate(input);
                assert.notEqual(urlToHandle(canonical), null, `input: ${JSON.stringify(input)}`);
            }
        });

        it('stored handles are stable through a rebuild round-trip', () => {
            for (const [input] of valid) {
                const canonical = validate(input);
                const handle = urlToHandle(canonical) as string;
                const rebuilt = handleToUrl(handle);
                assert.equal(validate(rebuilt), rebuilt, `input: ${JSON.stringify(input)}`);
                assert.equal(urlToHandle(rebuilt), handle, `input: ${JSON.stringify(input)}`);
            }
        });
    });
});

describe('sanitiseMastodonUrl', () => {
    it('strips the protocol', () => {
        assert.equal(sanitiseMastodonUrl('https://mastodon.xyz/@Flipboard@flipboard.social'), 'mastodon.xyz/@Flipboard@flipboard.social');
        assert.equal(sanitiseMastodonUrl('https://mastodon.social/@user@other.instance'), 'mastodon.social/@user@other.instance');
    });
});
