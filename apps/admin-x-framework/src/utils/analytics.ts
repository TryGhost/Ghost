// Wrapper function for Plausible event
type AnalyticsPropertyValue = string | number | boolean;

declare global {
    interface Window {
        plausible?: ((eventName: string, options: {props: Record<string, AnalyticsPropertyValue>}) => void),
    }
}

/**
 * Sends a tracking event to Plausible, if installed.
 *
 * By default, Plausible is not installed, in which case this function no-ops.
 */
export function trackEvent(eventName: string, props: Record<string, AnalyticsPropertyValue> = {}) {
    window.plausible = window.plausible || function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-rest-params
        ((window.plausible as any).q = (window.plausible as any).q || []).push(arguments as unknown);
    };
    window.plausible!(eventName, {props: props});
}

interface TrackedFilter {
    field: string;
    values: unknown[];
}

function sameValues(a: unknown[], b: unknown[]) {
    return a.length === b.length && a.every((value, i) => value === b[i]);
}

/**
 * Tracks an `Analytics Filter Used` event for each filter whose values were
 * added or changed between two filter states. Removing a filter entirely (or
 * clearing all filters) is not tracked.
 */
export function trackFilterApplications(previous: TrackedFilter[], next: TrackedFilter[], context: string) {
    next.forEach((filter) => {
        if (filter.values.length === 0) {
            return;
        }
        const previousFilter = previous.find(f => f.field === filter.field);
        if (!previousFilter || !sameValues(previousFilter.values, filter.values)) {
            trackEvent('Analytics Filter Used', {filter: filter.field, context});
        }
    });
}
