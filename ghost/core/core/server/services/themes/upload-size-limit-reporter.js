const logging = require('@tryghost/logging');
const sentry = require('../../../shared/sentry');

const THEME_UPLOAD_LOG_KEY = '[theme-upload]';
const SIZE_LIMIT_EVENTS_BY_CODE = {
    COMPRESSED_TOO_LARGE: 'compressed_too_large',
    ENTRY_TOO_LARGE: 'entry_too_large',
    TOTAL_TOO_LARGE: 'total_too_large'
};

const isThemeUploadSizeLimitError = (err) => {
    return err.errorType === 'UnsupportedMediaTypeError' && !!SIZE_LIMIT_EVENTS_BY_CODE[err.code];
};

const reportThemeUploadSizeLimitError = (err, {themeName = null, zip = null} = {}) => {
    if (!isThemeUploadSizeLimitError(err)) {
        return;
    }

    const eventName = `theme_upload.${SIZE_LIMIT_EVENTS_BY_CODE[err.code]}`;
    const errorDetails = err.errorDetails || {};
    const eventDetails = {
        theme_name: themeName,
        entry_name: errorDetails.entryName ?? null,
        observed_bytes: errorDetails.observedBytes,
        limit_bytes: errorDetails.limitBytes,
        compressed_size_bytes: zip?.size ?? null
    };

    logging.error({
        system: {event: eventName, ...eventDetails},
        err
    }, `${THEME_UPLOAD_LOG_KEY} ${err.message}`);

    sentry.captureException(err, {
        tags: {source: eventName},
        extra: eventDetails
    });
};

module.exports = {
    isThemeUploadSizeLimitError,
    reportThemeUploadSizeLimitError
};
