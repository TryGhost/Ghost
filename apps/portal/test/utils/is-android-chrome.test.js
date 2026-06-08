import {isAndroidChrome} from '../../src/utils/is-android-chrome';

describe('Android + Chrome detection', () => {
    const ANDROID_CHROME_UA = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.7559.77 Mobile Safari/537.36';
    const ANDROID_FIREFOX_UA = 'Mozilla/5.0 (Android 16; Mobile; rv:68.0) Gecko/68.0 Firefox/147.0';
    const LINUX_CHROME_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.3';

    it('returns true for Android Chrome', () => {
        expect(isAndroidChrome({
            userAgentData: {platform: 'Android'},
            userAgent: ANDROID_CHROME_UA
        })).toBe(true);
        expect(isAndroidChrome({
            userAgent: ANDROID_CHROME_UA
        })).toBe(true);
    });

    it('returns false for other user agents', () => {
        expect(isAndroidChrome({
            userAgentData: {platform: 'Android'},
            userAgent: ANDROID_FIREFOX_UA
        })).toBe(false);
        expect(isAndroidChrome({
            userAgent: ANDROID_FIREFOX_UA
        })).toBe(false);
        expect(isAndroidChrome({
            userAgent: LINUX_CHROME_UA
        })).toBe(false);
    });

    it('returns false if `userAgentData` is not Android, even if the UA string says Android', () => {
        expect(isAndroidChrome({
            userAgentData: {platform: 'Linux'},
            userAgent: ANDROID_CHROME_UA
        })).toBe(false);
    });
});