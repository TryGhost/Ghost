// Wrapper function for Plausible event

/**
 * Sends a tracking event to Plausible, if installed.
 *
 * By default, Plausible is not installed, in which case this function no-ops.
 *
 * @param {string} eventName A string name for the event being tracked
 * @param {Object} [props={}] An optional object of properties to include with the event
 */
export function trackEvent(eventName, props = {}) {
    window.plausible = window.plausible || function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
    };
    window.plausible(eventName, {props: props});
}
