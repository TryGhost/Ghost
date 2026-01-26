/**
 * @param {Readonly<{
 *     userAgentData?: Readonly<{
 *         platform?: string;
 *     }>;
 *     userAgent: string;
 * }>} navigator
 * @returns {boolean}
 */
export function isAndroid(navigator) {
    if (typeof navigator.userAgentData?.platform === 'string') {
        return navigator.userAgentData.platform === 'Android';
    }
    return /android/i.test(navigator.userAgent);
}