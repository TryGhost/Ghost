import {createPlatformValidator} from './platform-validator';

// YouTube profile URLs come in three shapes: modern @handles (3–30 chars,
// letters/numbers/._- with no boundary punctuation — non-Latin scripts are
// supported), legacy /user/ usernames and /channel/ IDs (UC + 22 chars).
// Bare input defaults to an @handle.
const youtube = createPlatformValidator({
    domains: ['youtube.com'],
    www: true,
    pathTypes: [
        {urlPrefix: '@', storagePrefix: '@', rule: {unicode: true, extra: '._-', min: 3, max: 30, notAtBoundary: '._-', notConsecutive: '.'}},
        {urlPrefix: 'user/', storagePrefix: 'user/', rule: {extra: '._-', min: 1, max: 50}},
        {urlPrefix: 'channel/', storagePrefix: 'channel/', rule: {patterns: [/^UC[a-zA-Z0-9_-]{22}$/]}}
    ],
    errors: {
        invalidUrl: 'The URL must be in a format like https://www.youtube.com/@yourUsername, https://www.youtube.com/user/yourUsername, or https://www.youtube.com/channel/yourChannelId',
        invalidUsername: 'Your Username is not a valid YouTube Username'
    }
});

export const validateYouTubeUrl = youtube.validate;
export const youtubeHandleToUrl = youtube.handleToUrl;
export const youtubeUrlToHandle = youtube.urlToHandle;
