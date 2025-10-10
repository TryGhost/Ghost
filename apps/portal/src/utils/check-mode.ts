export const isPreviewMode = function (): boolean {
    return isNormalPreviewMode() || isOfferPreviewMode();
};

export const isNormalPreviewMode = function (): boolean {
    const [path] = window.location.hash.substr(1).split('?');
    return (path === '/portal/preview');
};

export const isOfferPreviewMode = function (): boolean {
    const [path] = window.location.hash.substr(1).split('?');
    return (path === '/portal/preview/offer');
};

/* eslint-disable no-undef */

interface DevModeOptions {
    customSiteUrl?: string;
}

export const isDevMode = function ({customSiteUrl = ''}: DevModeOptions = {}): boolean {
    if (customSiteUrl && process.env.NODE_ENV === 'development') {
        return false;
    }
    return (process.env.NODE_ENV === 'development');
};

export const isTestMode = function (): boolean {
    return (process.env.NODE_ENV === 'test');
};

/* eslint-enable no-undef */

type ModeFn = (options?: DevModeOptions) => boolean;

const modeFns: Record<string, ModeFn> = {
    preview: isPreviewMode,
    offerPreview: isOfferPreviewMode,
    dev: isDevMode,
    test: isTestMode
};

export const hasMode = (modes: string[] = [], options: DevModeOptions = {}): boolean => {
    return modes.some((mode) => {
        const modeFn = modeFns[mode];
        return !!(modeFn && modeFn(options));
    });
};
