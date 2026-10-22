// Wrapper function for Plausible event

declare global {
    interface Window {
        plausible?: {
            (eventName: string, options: { props: Record<string, unknown> }): void;
            q?: unknown[][];
        };
        posthog?: {
            capture: (eventName: string, props: Record<string, unknown>) => void;
        };
    }
}

export default function trackEvent(eventName: string, props: Record<string, unknown> = {}) {
    window.plausible = window.plausible || function (...args: unknown[]) {
        (window.plausible!.q = window.plausible!.q || []).push(args);
    };
    window.plausible(eventName, {props: props});
    if (window.posthog) {
        window.posthog.capture(eventName, props);
    }
}
