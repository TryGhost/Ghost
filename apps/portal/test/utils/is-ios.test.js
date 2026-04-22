import {isIos} from '../../src/utils/is-ios';

describe('iOS detection', () => {
    const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
    const MAC_SAFARI_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
    const ANDROID_CHROME_UA = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.7559.77 Mobile Safari/537.36';
    const IPAD_LEGACY_UA = 'Mozilla/5.0 (iPad; CPU OS 12_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1';
    const IPOD_UA = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 Mobile/15E148 Safari/604.1';

    it('returns true for iOS', () => {
        expect(isIos({
            userAgent: IPHONE_UA,
            platform: 'iPhone',
            maxTouchPoints: 0
        })).toBe(true);
        expect(isIos({
            userAgent: MAC_SAFARI_UA,
            platform: 'MacIntel',
            maxTouchPoints: 5
        })).toBe(true);
        expect(isIos({
            userAgent: IPAD_LEGACY_UA,
            platform: 'iPad',
            maxTouchPoints: 0
        })).toBe(true);
        expect(isIos({
            userAgent: IPOD_UA,
            platform: 'iPod',
            maxTouchPoints: 0
        })).toBe(true);
    });

    it('returns false for other user agents', () => {
        expect(isIos({
            userAgent: ANDROID_CHROME_UA,
            platform: 'Linux',
            maxTouchPoints: 5
        })).toBe(false);
        expect(isIos({
            userAgent: MAC_SAFARI_UA,
            platform: 'MacIntel',
            maxTouchPoints: 0
        })).toBe(false);
        expect(isIos({
            userAgent: MAC_SAFARI_UA,
            platform: 'Linux',
            maxTouchPoints: 5
        })).toBe(false);
    });

    it('returns false if user agent doesn\'t match and it doesn\'t look like an iPad', () => {
        expect(isIos({
            userAgent: MAC_SAFARI_UA,
            platform: 'Macintosh',
            maxTouchPoints: 5
        })).toBe(false);
        expect(isIos({
            userAgent: MAC_SAFARI_UA,
            platform: 'MacIntel',
            maxTouchPoints: 1
        })).toBe(false);
    });
});