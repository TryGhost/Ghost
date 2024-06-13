import {
    isAjaxError
} from 'ember-ajax/errors';

export function beforeSend(event, hint) {
    try {
        const exception = hint.originalException;
        event.tags = event.tags || {};
        event.tags.shown_to_user = event.tags.shown_to_user || false;
        event.tags.grammarly = !!document.querySelector('[data-gr-ext-installed]');

        // Do not report "handled" errors to Sentry
        if (event.tags.shown_to_user === true) {
            return null;
        }

        // if the error value includes a model id then overwrite it to improve grouping
        if (event.exception && event.exception.values && event.exception.values.length > 0) {
            const pattern = /<(post|page):[a-f0-9]+>/;
            const replacement = '<$1:ID>';
            event.exception.values[0].value = event.exception.values[0].value.replace(pattern, replacement);
        }

        // ajax errors — improve logging and add context for debugging
        if (isAjaxError(exception) && exception.payload && exception.payload.errors && exception.payload.errors.length > 0) {
            const error = exception.payload.errors[0];
            event.exception.values[0].type = `${error.type}: ${error.context}`;
            event.exception.values[0].value = error.message;
            event.exception.values[0].context = error.context;
        } else {
            delete event.contexts.ajax;
            delete event.tags.ajax_status;
            delete event.tags.ajax_method;
            delete event.tags.ajax_url;
        }

        // Do not report poshog-js errors to Sentry
        if (hint && hint.originalException && hint.originalException.stack) {
            if (hint.originalException.stack.includes('/posthog-js/')) {
                return null;
            }
        }

        return event;
    } catch (error) {
        // If any errors occur in beforeSend, send the original event to Sentry
        // Better to have some information than no information
        return event;
    }
}
