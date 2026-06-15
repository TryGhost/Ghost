/**
 * Platform-detection helpers used by the magic-link "Open inbox" button.
 * Verbatim ports of Portal's is-ios.js / is-android-chrome.js.
 */

type IosNavigator = Readonly<Pick<Navigator, 'maxTouchPoints' | 'platform' | 'userAgent'>>;

export function isIos(nav: IosNavigator): boolean {
    return (
        /iPad|iPhone|iPod/.test(nav.userAgent) ||
        // Modern iPads identify as MacIntel but expose touch support.
        (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
    );
}

interface AndroidNavigator {
    userAgentData?: Readonly<{platform?: string}>;
    userAgent: string;
}

function isAndroid(nav: AndroidNavigator): boolean {
    if (typeof nav.userAgentData?.platform === 'string') {
        return nav.userAgentData.platform === 'Android';
    }
    return /android/i.test(nav.userAgent);
}

function isChrome(nav: Pick<Navigator, 'userAgent'>): boolean {
    return /chrome/i.test(nav.userAgent);
}

export function isAndroidChrome(nav: AndroidNavigator & Pick<Navigator, 'userAgent'>): boolean {
    return isAndroid(nav) && isChrome(nav);
}
