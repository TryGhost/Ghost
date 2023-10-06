// Wrapper function for Plausible event
type PlausiblePropertyValue = string|number|boolean

declare global {
    interface Window {
        plausible?: ((eventName: string, options: {props: Record<string, PlausiblePropertyValue>}) => void)
    }
}

export default function trackEvent(eventName: string, props: Record<string, PlausiblePropertyValue> = {}) {
    window.plausible = window.plausible || function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-rest-params
        ((window.plausible as any).q = (window.plausible as any).q || []).push(arguments as unknown);
    };
    window.plausible!(eventName, {props: props});
}
