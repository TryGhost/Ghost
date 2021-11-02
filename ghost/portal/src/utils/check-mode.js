export const isPreviewMode = function () {
    return isNormalPreviewMode() || isOfferPreviewMode();
};

export const isNormalPreviewMode = function () {
    const [path] = window.location.hash.substr(1).split('?');
    return (path === '/portal/preview');
};

export const isOfferPreviewMode = function () {
    const [path] = window.location.hash.substr(1).split('?');
    return (path === '/portal/preview/offer');
};

export const isDevMode = function ({customSiteUrl = ''} = {}) {
    if (customSiteUrl && process.env.NODE_ENV === 'development') {
        return false;
    }
    return (process.env.NODE_ENV === 'development');
};

export const isTestMode = function () {
    return (process.env.NODE_ENV === 'test');
};

const modeFns = {
    preview: isPreviewMode,
    offerPreview: isOfferPreviewMode,
    dev: isDevMode,
    test: isTestMode
};

export const hasMode = (modes = [], options = {}) => {
    return modes.some((mode) => {
        const modeFn = modeFns[mode];
        return !!(modeFn && modeFn(options));
    });
};
