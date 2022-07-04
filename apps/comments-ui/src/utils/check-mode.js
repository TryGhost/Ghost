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
    dev: isDevMode,
    test: isTestMode
};

export const hasMode = (modes = [], options = {}) => {
    return modes.some((mode) => {
        const modeFn = modeFns[mode];
        return !!(modeFn && modeFn(options));
    });
};
