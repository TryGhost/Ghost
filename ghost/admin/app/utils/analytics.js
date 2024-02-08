// Wrapper function for Plausible event

export function trackEvent(eventName, props = {}) {
    window.plausible = window.plausible || function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
    };
    window.plausible(eventName, {props: props});
}

/**
 * Load the PostHog toolbar if available
 * window.posthog must be available for this to do anything
 * This function needs to be called before the Admin App is fully initialized
 * because the Admin App overwrites the #__posthog hash with its own routing
 * before the PostHog snippet can read it and load the toolbar itself.
 * @returns {void}
 */
export function loadToolbar() {
    try {
        const toolbarJSON = new URLSearchParams(window.location.hash.substring(1)).get('__posthog');
        if (toolbarJSON && window.posthog) {
                window.posthog.loadToolbar(JSON.parse(toolbarJSON));
        }
    } catch (e) {
        // fail silently
    }
}

