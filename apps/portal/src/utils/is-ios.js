/**
 * @param {Readonly<
 *     Pick<Navigator, 'maxTouchPoints' | 'platform' | 'userAgent'>
 * }>} navigator
 * @returns {boolean}
 */
export const isIos = navigator => (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // Checks for modern iPads (iPadOS) which mimic macOS
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);