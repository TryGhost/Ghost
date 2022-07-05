export const createPopupNotification = ({type, status, autoHide, duration = 2600, closeable, state, message, meta = {}}) => {
    let count = 0;
    if (state && state.popupNotification) {
        count = (state.popupNotification.count || 0) + 1;
    }
    return {
        type,
        status,
        autoHide,
        closeable,
        duration,
        meta,
        message,
        count
    };
};

export function transformApiSiteData({site}) {
    if (!site) {
        return null;
    }

    return site;
}

export function isSentryEventAllowed({event: sentryEvent}) {
    const frames = sentryEvent?.exception?.values?.[0]?.stacktrace?.frames || [];
    const fileNames = frames.map(frame => frame.filename).filter(filename => !!filename);
    const lastFileName = fileNames[fileNames.length - 1] || '';
    return lastFileName.includes('@tryghost/comments');
}
