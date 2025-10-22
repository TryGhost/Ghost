/**
 * Body Scroll Lock Utility
 *
 * Manages body scroll behavior when modal is opened/closed.
 * Prevents background scrolling and accounts for scrollbar width.
 */

/**
 * Lock body scroll and adjust for scrollbar width
 * @param {number} scrollbarWidth - Width of scrollbar in pixels
 * @returns {object} Previous scroll state for restoration
 */
export function lockBodyScroll(scrollbarWidth) {
    try {
        // Store current overflow and margin for restoration
        const previousOverflow = window.document?.body?.style?.overflow;
        const previousMargin = window.getComputedStyle(document.body).getPropertyValue('margin-right');

        // Lock scroll
        window.document.body.style.overflow = 'hidden';

        // Adjust margin to prevent layout shift from scrollbar disappearing
        if (scrollbarWidth) {
            window.document.body.style.marginRight = `calc(${previousMargin} + ${scrollbarWidth}px)`;
        }

        return {
            previousOverflow: previousOverflow || '',
            previousMargin
        };
    } catch (e) {
        // Ignore errors in edge cases (e.g., iframe, restricted contexts)
        return {
            previousOverflow: '',
            previousMargin: '0px'
        };
    }
}

/**
 * Unlock body scroll and restore previous state
 * @param {object} previousState - State returned from lockBodyScroll
 */
export function unlockBodyScroll(previousState) {
    try {
        const {previousOverflow, previousMargin} = previousState;

        // Restore overflow
        window.document.body.style.overflow = previousOverflow;

        // Restore margin
        if (!previousMargin || previousMargin === '0px') {
            window.document.body.style.marginRight = '';
        } else {
            window.document.body.style.marginRight = previousMargin;
        }
    } catch (e) {
        // Ignore errors
    }
}
