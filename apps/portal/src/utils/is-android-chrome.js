/**
 * @param {Readonly<{
 *     userAgentData?: Readonly<{
 *         platform?: string;
 *     }>;
 *     userAgent: string;
 * }>} navigator
 * @returns {boolean}
 */
const isAndroid = (navigator) => {
    if (typeof navigator.userAgentData?.platform === 'string') {
        return navigator.userAgentData.platform === 'Android';
    }
    return /android/i.test(navigator.userAgent);
};

/**
 * @param {Readonly<Pick<Navigator, 'userAgent'>} navigator
 * @returns {boolean}
 */
const isChrome = navigator => /chrome/i.test(navigator.userAgent);

/**
 * @param {Readonly<{
 *     userAgentData?: Readonly<{
 *         platform?: string;
 *     }>;
 *     userAgent: string;
 * }>} navigator
 * @returns {boolean}
 */
export const isAndroidChrome = navigator => isAndroid(navigator) && isChrome(navigator);