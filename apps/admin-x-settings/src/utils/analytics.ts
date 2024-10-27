// Wrapper function for Plausible event
type AnalyticsPropertyValue = string|number|boolean

declare global {
    interface Window {
        plausible?: ((eventName: string, options: {props: Record<string, AnalyticsPropertyValue>}) => void),
        posthog?: {
            capture: (eventName: string, props: Record<string, AnalyticsPropertyValue>) => void
        }
    }
}

export default function trackEvent(eventName: string, props: Record<string, AnalyticsPropertyValue> = {}) {
    window.plausible = window.plausible || function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-rest-params
        ((window.plausible as any).q = (window.plausible as any).q || []).push(arguments as unknown);
    };
    window.plausible!(eventName, {props: props});
    if (window.posthog) {
        window.posthog.capture(eventName, props);
    }
}
