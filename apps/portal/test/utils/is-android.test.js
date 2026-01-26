import {isAndroid} from '../../src/utils/is-android';

describe('Android detection', () => {
    const ANDROID_CHROME_UA = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.7559.77 Mobile Safari/537.36';
    const ANDROID_FIREFOX_UA = 'Mozilla/5.0 (Android 16; Mobile; rv:68.0) Gecko/68.0 Firefox/147.0';
    const MACOS_FIREFOX_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0';

    it('uses userAgentData.platform when available', () => {
        // This test uses mismatched user agent strings to make sure
        // `userAgentData` is preferred.
        expect(isAndroid({
            userAgentData: {platform: 'Android'},
            userAgent: MACOS_FIREFOX_UA
        })).toBe(true);
        expect(isAndroid({
            userAgentData: {platform: 'Linux'},
            userAgent: ANDROID_CHROME_UA
        })).toBe(false);
    });

    test('uses the User-Agent string as a fallback', () => {
        expect(isAndroid({
            userAgentData: {},
            userAgent: ANDROID_CHROME_UA
        })).toBe(true);
        expect(isAndroid({
            userAgentData: {},
            userAgent: MACOS_FIREFOX_UA
        })).toBe(false);

        expect(isAndroid({userAgent: ANDROID_CHROME_UA})).toBe(true);
        expect(isAndroid({userAgent: ANDROID_FIREFOX_UA})).toBe(true);
        expect(isAndroid({userAgent: MACOS_FIREFOX_UA})).toBe(false);
    });
});