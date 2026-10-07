import {
  debugIntegration,
  replayIntegration,
  type Breadcrumb,
  type BrowserOptions,
  type Event,
  type EventHint,
} from '@sentry/react';

export type Integration = Extract<NonNullable<BrowserOptions['integrations']>, unknown[]>[number];

const FILTERED_URL_REGEX = /\/e\.ghost\.org|plausible\.io/;

export const AUTOMATIONS_MASK_ATTRIBUTE = 'data-sentry-automations-mask';

export interface SentryConfigInput {
  dsn: string;
  environment: string | undefined;
  version: string;
  transport?: BrowserOptions['transport'];
}

export function getSentryConfig({
  dsn,
  environment,
  version,
  transport,
}: SentryConfigInput): BrowserOptions {
  const extraIntegrations: Integration[] = [];
  const config: BrowserOptions = {
    dsn,
    transport,
    environment,
    release: `ghost@${version}`,
    beforeSend,
    beforeBreadcrumb,
    ignoreErrors: [
      // Browser autoplay policies
      /The play\(\) request was interrupted.*/,
      /The request is not allowed by the user agent or the platform in the current context/,

      // Network errors that we don't control
      /Server was unreachable/,
      /NetworkError when attempting to fetch resource./,
      /Failed to fetch/,
      /Load failed/,
      /The operation was aborted./,

      // Ember-only; remove with Ember (https://github.com/emberjs/ember.js/issues/12505)
      /^TransitionAborted$/,
      // Harmless loop warnings, mostly from extensions and embedded content
      /^ResizeObserver loop completed with undelivered notifications/,
      /^ResizeObserver loop limit exceeded/,
      // Ember-only; remove with Ember (ember-concurrency cancelation rejections)
      'TaskCancelation',
    ],
    integrations: (defaultIntegrations) => [
      // Tests send identical events back to back
      ...defaultIntegrations.filter(
        (integration) => !(environment === 'testing' && integration.name === 'Dedupe'),
      ),
      ...extraIntegrations,
    ],
  };

  if (environment !== 'testing') {
    config.replaysOnErrorSampleRate = 0.5;
    extraIntegrations.push(
      replayIntegration({
        mask: ['.koenig-lexical', '.gh-dashboard', `[${AUTOMATIONS_MASK_ATTRIBUTE}]`],
        unmask: [
          `body:not([${AUTOMATIONS_MASK_ATTRIBUTE}]) [role="menu"]`,
          `body:not([${AUTOMATIONS_MASK_ATTRIBUTE}]) [data-testid="settings-panel"]`,
          `body:not([${AUTOMATIONS_MASK_ATTRIBUTE}]) .gh-nav`,
        ],
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    );
  }

  if (environment === 'development') {
    extraIntegrations.push(debugIntegration());
  }

  return config;
}

export function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const url: unknown = breadcrumb.data?.url;
  if (breadcrumb.category === 'http' && typeof url === 'string' && FILTERED_URL_REGEX.test(url)) {
    return null;
  }
  return breadcrumb;
}

interface EmberAjaxPayloadError {
  type?: string;
  context?: string;
  message?: string;
}

export function beforeSend(event: Event, hint?: EventHint): Event | null {
  try {
    event.contexts = event.contexts || {};
    event.tags = event.tags || {};
    event.tags.shown_to_user = event.tags.shown_to_user || false;
    event.tags.grammarly = !!document.querySelector('[data-gr-ext-installed]');

    if (event.tags.shown_to_user === true) {
      return null;
    }

    if (event.request?.url && FILTERED_URL_REGEX.test(event.request.url)) {
      return null;
    }

    // Model ids split otherwise identical errors into separate issues
    const firstException = event.exception?.values?.[0];
    if (firstException?.value) {
      firstException.value = firstException.value.replace(/<(post|page):[a-f0-9]+>/, '<$1:ID>');
    }

    // Ember-only; remove with Ember (ember-ajax errors carry the API error in `payload.errors`)
    const originalException = hint?.originalException as
      | { payload?: { errors?: unknown } }
      | null
      | undefined;
    const ajaxErrors = originalException?.payload?.errors;
    if (Array.isArray(ajaxErrors) && ajaxErrors.length) {
      if (firstException) {
        const error = ajaxErrors[0] as EmberAjaxPayloadError;
        firstException.type = `${error.type}: ${error.context}`;
        firstException.value = error.message;
        Object.assign(firstException, { context: error.context });
      }
    } else {
      delete event.contexts.ajax;
      delete event.tags.ajax_status;
      delete event.tags.ajax_method;
      delete event.tags.ajax_url;
    }

    return event;
  } catch {
    // A partial event is more useful than a dropped one
    return event;
  }
}
