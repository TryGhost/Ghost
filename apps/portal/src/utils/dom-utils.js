/**
 * Calculate scrollbar width for layout shift prevention
 * Creates a temporary div with forced scrollbar to measure width
 * @returns {number} Scrollbar width in pixels
 */
export function getScrollbarWidth() {
    // Create a temporary div
    const div = document.createElement('div');
    div.style.visibility = 'hidden';
    div.style.overflow = 'scroll'; // forcing scrollbar to appear
    document.body.appendChild(div);

    // Calculate the width difference
    const scrollbarWidth = div.offsetWidth - div.clientWidth;

    // Clean up
    document.body.removeChild(div);

    return scrollbarWidth;
}

/**
 * Send portal-ready event to parent window (for iframe embedding)
 */
export function sendPortalReadyEvent() {
    if (window.self !== window.parent) {
        window.parent.postMessage({
            type: 'portal-ready',
            payload: {}
        }, '*');
    }
}

/**
 * Get all recommendation tracking buttons on the page
 * @returns {NodeList} List of elements with data-recommendation attribute
 */
export function getRecommendationButtons() {
    const customTriggerSelector = '[data-recommendation]';
    return document.querySelectorAll(customTriggerSelector) || [];
}

/**
 * Setup click tracking for recommendation buttons
 * @param {Function} onRecommendationClick - Callback for recommendation clicks
 */
export function setupRecommendationButtons(onRecommendationClick) {
    // Handler for custom buttons
    const clickHandler = (event) => {
        // Send beacons for recommendation clicks
        const recommendationId = event.currentTarget.dataset.recommendation;

        if (recommendationId) {
            onRecommendationClick(recommendationId).catch(console.error); // eslint-disable-line no-console
        } else {
            // eslint-disable-next-line no-console
            console.warn('[Portal] Invalid usage of data-recommendation attribute');
        }
    };

    const elements = getRecommendationButtons();
    for (const element of elements) {
        element.addEventListener('click', clickHandler, {passive: true});
    }
}

/**
 * Show lexical signup forms when user is not logged in
 * The signup card ships hidden by default
 */
export function showLexicalSignupForms() {
    const formElements = document.querySelectorAll('[data-lexical-signup-form]');
    if (formElements.length > 0) {
        formElements.forEach((element) => {
            element.style.display = '';
        });
    }
}
