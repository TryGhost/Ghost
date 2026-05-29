type AnalyticsPropertyValue = string | number | boolean;

declare global {
    interface Window {
        plausible?: ((eventName: string, options: {props: Record<string, AnalyticsPropertyValue>}) => void);
    }
}

/**
 * Sends a product-analytics event to Plausible if installed, no-op otherwise
 * (e.g. self-hosted). Mirrors the admin's trackEvent. Gift-link admin actions
 * fire after Plausible has loaded, so no pre-load queue is needed here.
 */
export default function trackEvent(eventName: string, props: Record<string, AnalyticsPropertyValue> = {}): void {
    if (typeof window.plausible === 'function') {
        window.plausible(eventName, {props});
    }
}
