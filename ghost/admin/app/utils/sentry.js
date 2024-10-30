import {Debug} from '@sentry/integrations';
import {Replay} from '@sentry/replay';
import {isAjaxError} from 'ember-ajax/errors';

const FILTERED_URL_REGEX = /\/e\.ghost\.org|plausible\.io/;

export function getSentryConfig(dsn, environment, appVersion, transport) {
    const extraIntegrations = [];

    const config = {
        dsn,
        transport,
        environment,
        release: `ghost@${appVersion}`,
        beforeSend,
        ignoreErrors: [
            // Browser autoplay policies (this regex covers a few)
            /The play\(\) request was interrupted.*/,
            /The request is not allowed by the user agent or the platform in the current context/,

            // Network errors that we don't control
            /Server was unreachable/,
            /NetworkError when attempting to fetch resource./,
            /Failed to fetch/,
            /Load failed/,
            /The operation was aborted./,

            // TransitionAborted errors surface from normal application behaviour
            // - https://github.com/emberjs/ember.js/issues/12505
            /^TransitionAborted$/,
            // ResizeObserver loop errors occur often from extensions and
            // embedded content, generally harmless and not useful to report
            /^ResizeObserver loop completed with undelivered notifications/,
            /^ResizeObserver loop limit exceeded/,
            // When tasks in ember-concurrency are canceled, they sometimes lead to unhandled Promise rejections
            // This doesn't affect the application and is not useful to report
            // - http://ember-concurrency.com/docs/cancelation
            'TaskCancelation'
        ],
        integrations: function (integrations) {
            // integrations will be all default integrations
            const defaultIntegrations = integrations.filter((integration) => {
                // Don't dedupe events when testing
                if (environment === 'testing' && integration.name === 'Dedupe') {
                    return false;
                }

                return true;
            });

            return [...defaultIntegrations, ...extraIntegrations];
        },
        beforeBreadcrumb(breadcrumb) {
            // ignore breadcrumbs for event tracking to reduce noise in error reports
            if (breadcrumb.category === 'http' && breadcrumb.data?.url?.match(FILTERED_URL_REGEX)) {
                return null;
            }
            return breadcrumb;
        }
    };

    if (environment !== 'testing') {
        try {
            // Session Replay on errors
            // Docs: https://docs.sentry.io/platforms/javascript/session-replay
            config.replaysOnErrorSampleRate = 0.5;
            extraIntegrations.push(
                // Replace with `Sentry.replayIntegration()` once we've migrated to @sentry/ember 8.x
                // Docs: https://docs.sentry.io/platforms/javascript/migration/v7-to-v8/#removal-of-sentryreplay-package
                new Replay({
                    mask: ['.koenig-lexical', '.gh-dashboard'],
                    unmask: ['[role="menu"]', '[data-testid="settings-panel"]', '.gh-nav'],
                    maskAllText: false,
                    maskAllInputs: true,
                    blockAllMedia: true
                })
            );
        } catch (e) {
            // no-op, Session Replay is not critical
            console.error('Error enabling Sentry Replay:', e); // eslint-disable-line no-console
        }
    }

    if (environment === 'development') {
        extraIntegrations.push(new Debug());
    }

    return config;
}

export function getSentryTestConfig(transport) {
    return getSentryConfig(
        'https://abcdef0123456789abcdef0123456789@o12345.ingest.sentry.io/1234567',
        'testing',
        '5.0.0',
        transport
    );
}

export function beforeSend(event, hint) {
    try {
        const originalException = hint?.originalException;
        event.contexts = event.contexts || {};
        event.tags = event.tags || {};
        event.tags.shown_to_user = event.tags.shown_to_user || false;
        event.tags.grammarly = !!document.querySelector('[data-gr-ext-installed]');

        // Do not report "handled" errors to Sentry
        if (event.tags.shown_to_user === true) {
            return null;
        }

        // Do not report requests to our event tracking endpoints to reduce noise
        if (event.request?.url?.match(FILTERED_URL_REGEX)) {
            return null;
        }

        // if the error value includes a model id then overwrite it to improve grouping
        if (event.exception && event.exception.values && event.exception.values.length > 0) {
            const pattern = /<(post|page):[a-f0-9]+>/;
            const replacement = '<$1:ID>';
            event.exception.values[0].value = event.exception.values[0].value.replace(pattern, replacement);
        }

        // ajax errors — improve logging and add context for debugging
        if (isAjaxError(originalException) && originalException.payload && originalException.payload.errors && originalException.payload.errors.length > 0) {
            const error = originalException.payload.errors[0];
            event.exception.values[0].type = `${error.type}: ${error.context}`;
            event.exception.values[0].value = error.message;
            event.exception.values[0].context = error.context;
        } else {
            delete event.contexts.ajax;
            delete event.tags.ajax_status;
            delete event.tags.ajax_method;
            delete event.tags.ajax_url;
        }

        // Do not report posthog-js errors to Sentry
        if (originalException?.stack?.includes('/posthog-js/')) {
            return null;
        }

        return event;
    } catch (error) {
        console.error('Error in beforeSend:', error); // eslint-disable-line no-console
        // If any errors occur in beforeSend, send the original event to Sentry
        // Better to have some information than no information
        return event;
    }
}
