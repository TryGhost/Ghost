import {blueskyHandleToUrl, blueskyUrlToHandle, validateBlueskyUrl} from './bluesky';
import {facebookHandleToUrl, facebookUrlToHandle, validateFacebookUrl} from './facebook';
import {instagramHandleToUrl, instagramUrlToHandle, validateInstagramUrl} from './instagram';
import {linkedinHandleToUrl, linkedinUrlToHandle, validateLinkedInUrl} from './linkedin';
import {mastodonHandleToUrl, sanitiseMastodonUrl, validateMastodonUrl} from './mastodon';
import {threadsHandleToUrl, threadsUrlToHandle, validateThreadsUrl} from './threads';
import {tiktokHandleToUrl, tiktokUrlToHandle, validateTikTokUrl} from './tiktok';
import {twitterHandleToUrl, twitterUrlToHandle, validateTwitterUrl} from './twitter';
import {validateYouTubeUrl, youtubeHandleToUrl, youtubeUrlToHandle} from './youtube';

export const SOCIAL_PLATFORM_KEYS = [
    'twitter',
    'facebook',
    'linkedin',
    'bluesky',
    'threads',
    'mastodon',
    'tiktok',
    'youtube',
    'instagram'
] as const;

export type SocialPlatformKey = typeof SOCIAL_PLATFORM_KEYS[number];

export type SocialPlatformConfig = {
    key: SocialPlatformKey;
    staffTitle: string;
    publicationTitle: string;
    placeholder: string;
    testId: string;
    validate: (value: string) => string;
    toDisplayValue: (value: string | null | undefined) => string;
    toStoredValue: (value: string) => string | null;
};

const formatDisplayValue = (value: string | null | undefined, formatter: (handle: string) => string) => {
    return value ? formatter(value) : '';
};

export const SOCIAL_PLATFORM_CONFIGS: SocialPlatformConfig[] = [
    {
        key: 'twitter',
        staffTitle: 'X',
        publicationTitle: 'X',
        placeholder: 'https://x.com/username',
        testId: 'x-input',
        validate: validateTwitterUrl,
        toDisplayValue: value => formatDisplayValue(value, twitterHandleToUrl),
        toStoredValue: value => twitterUrlToHandle(value)
    },
    {
        key: 'facebook',
        staffTitle: 'Facebook',
        publicationTitle: 'Facebook',
        placeholder: 'https://www.facebook.com/username',
        testId: 'facebook-input',
        validate: validateFacebookUrl,
        toDisplayValue: value => formatDisplayValue(value, facebookHandleToUrl),
        toStoredValue: value => facebookUrlToHandle(value)
    },
    {
        key: 'linkedin',
        staffTitle: 'LinkedIn',
        publicationTitle: 'LinkedIn',
        placeholder: 'https://www.linkedin.com/in/username',
        testId: 'linkedin-input',
        validate: validateLinkedInUrl,
        toDisplayValue: value => formatDisplayValue(value, linkedinHandleToUrl),
        toStoredValue: value => linkedinUrlToHandle(value)
    },
    {
        key: 'bluesky',
        staffTitle: 'Bluesky',
        publicationTitle: 'Bluesky',
        placeholder: 'https://bsky.app/profile/username',
        testId: 'bluesky-input',
        validate: validateBlueskyUrl,
        toDisplayValue: value => formatDisplayValue(value, blueskyHandleToUrl),
        toStoredValue: value => blueskyUrlToHandle(value)
    },
    {
        key: 'threads',
        staffTitle: 'Threads',
        publicationTitle: 'Threads',
        placeholder: 'https://threads.net/@username',
        testId: 'threads-input',
        validate: validateThreadsUrl,
        toDisplayValue: value => formatDisplayValue(value, threadsHandleToUrl),
        toStoredValue: value => threadsUrlToHandle(value)
    },
    {
        key: 'mastodon',
        staffTitle: 'Mastodon',
        publicationTitle: 'Mastodon',
        placeholder: 'https://mastodon.social/@username',
        testId: 'mastodon-input',
        validate: validateMastodonUrl,
        toDisplayValue: value => formatDisplayValue(value, mastodonHandleToUrl),
        toStoredValue: value => (value ? sanitiseMastodonUrl(value) : null)
    },
    {
        key: 'tiktok',
        staffTitle: 'TikTok',
        publicationTitle: 'TikTok',
        placeholder: 'https://www.tiktok.com/@username',
        testId: 'tiktok-input',
        validate: validateTikTokUrl,
        toDisplayValue: value => formatDisplayValue(value, tiktokHandleToUrl),
        toStoredValue: value => tiktokUrlToHandle(value)
    },
    {
        key: 'youtube',
        staffTitle: 'YouTube',
        publicationTitle: 'YouTube',
        placeholder: 'https://www.youtube.com/@channel',
        testId: 'youtube-input',
        validate: validateYouTubeUrl,
        toDisplayValue: value => formatDisplayValue(value, youtubeHandleToUrl),
        toStoredValue: value => youtubeUrlToHandle(value)
    },
    {
        key: 'instagram',
        staffTitle: 'Instagram',
        publicationTitle: 'Instagram',
        placeholder: 'https://www.instagram.com/username',
        testId: 'instagram-input',
        validate: validateInstagramUrl,
        toDisplayValue: value => formatDisplayValue(value, instagramHandleToUrl),
        toStoredValue: value => instagramUrlToHandle(value)
    }
];

export const SOCIAL_PLATFORM_CONFIG_BY_KEY = Object.fromEntries(
    SOCIAL_PLATFORM_CONFIGS.map(config => [config.key, config])
) as Record<SocialPlatformKey, SocialPlatformConfig>;

export const normalizeSocialInput = (key: SocialPlatformKey, value: string) => {
    const normalizedUrl = SOCIAL_PLATFORM_CONFIG_BY_KEY[key].validate(value);

    return {
        displayValue: normalizedUrl,
        storedValue: normalizedUrl ? SOCIAL_PLATFORM_CONFIG_BY_KEY[key].toStoredValue(normalizedUrl) : null
    };
};

export const getSocialValidationError = (key: SocialPlatformKey, value: string | null | undefined) => {
    try {
        SOCIAL_PLATFORM_CONFIG_BY_KEY[key].validate(value || '');
        return '';
    } catch (error) {
        if (error instanceof Error) {
            return error.message;
        }

        return '';
    }
};
