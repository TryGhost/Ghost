/**
 * Custom Trigger Button Utilities
 *
 * Manages DOM elements with [data-portal] attributes that trigger portal actions.
 * These are buttons/links on the host page that open the portal modal.
 */

/**
 * Setup custom trigger button event handlers
 * Finds all elements with [data-portal] attribute and attaches click handlers
 *
 * @param {Function} onTriggerClick - Callback when a trigger button is clicked
 *                                    Receives the event object
 * @returns {Object} Object with buttons NodeList and cleanup function
 */
export function setupCustomTriggerButtons(onTriggerClick) {
    const customTriggerSelector = '[data-portal]';
    const popupCloseClass = 'gh-portal-close';
    const buttons = document.querySelectorAll(customTriggerSelector) || [];

    const clickHandler = (event) => {
        event.preventDefault();
        onTriggerClick(event);
    };

    // Setup each button
    buttons.forEach((button) => {
        button.classList.add(popupCloseClass);
        // Remove any existing event listener to avoid duplicates
        button.removeEventListener('click', clickHandler);
        button.addEventListener('click', clickHandler);
    });

    // Return buttons and cleanup function
    return {
        buttons,
        clickHandler,
        cleanup: () => {
            buttons.forEach((button) => {
                button.removeEventListener('click', clickHandler);
            });
        }
    };
}

/**
 * Update CSS classes on custom trigger buttons based on popup state
 * Toggles between 'gh-portal-open' and 'gh-portal-close' classes
 *
 * @param {NodeList|Array} buttons - List of button elements to update
 * @param {boolean} isPopupOpen - Whether the popup is currently open
 */
export function updateCustomTriggerClasses(buttons, isPopupOpen) {
    const popupOpenClass = 'gh-portal-open';
    const popupCloseClass = 'gh-portal-close';

    if (!buttons) {
        return;
    }

    buttons.forEach((button) => {
        const elAddClass = isPopupOpen ? popupOpenClass : popupCloseClass;
        const elRemoveClass = isPopupOpen ? popupCloseClass : popupOpenClass;
        button.classList.add(elAddClass);
        button.classList.remove(elRemoveClass);
    });
}
