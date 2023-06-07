// Wrapper function for Plausible event

export default function trackEvent(eventName, props = {}) {
    window.plausible = window.plausible || function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
    };
    window.plausible(eventName, {props: props});
}
