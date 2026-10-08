import {
  debugIntegration,
  replayIntegration,
  type Breadcrumb,
  type BrowserOptions,
  type Event,
} from '@sentry/react';
import { loadedKoenigVersion } from '@/settings/components/koenig-loader';

export type Integration = Extract<NonNullable<BrowserOptions['integrations']>, unknown[]>[number];

const FILTERED_URL_REGEX = /\/e\.ghost\.org|plausible\.io/;

const LEXICAL_ERROR_REGEX = /Minified Lexical error #\d+/;

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

      // Network errors that we don't control, anchored so chunk-load failures
      // ("Failed to fetch dynamically imported module: …") still report
      /Server was unreachable/,
      /^NetworkError when attempting to fetch resource\.$/,
      /^Failed to fetch$/,
      /^Load failed$/,
      // Firefox's message ends with a space; Sentry prefixes Safari's stackless
      // DOMException with its name
      /^(AbortError: )?The operation was aborted\. ?$/,

      // Harmless loop warnings, mostly from extensions and embedded content
      /^ResizeObserver loop completed with undelivered notifications/,
      /^ResizeObserver loop limit exceeded/,
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

export function beforeSend(event: Event): Event | null {
  try {
    event.contexts = event.contexts || {};
    event.tags = event.tags || {};
    event.tags.shown_to_user = event.tags.shown_to_user || false;
    event.tags.grammarly = !!document.querySelector('[data-gr-ext-installed]');

    // The publish flow reports only the failures it did not expect
    if (event.tags.shown_to_user === true && event.tags.source !== 'publish-flow') {
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

    // Lexical often throws from its own DOM listeners, which only the global handlers catch
    if (event.tags.lexical === undefined && LEXICAL_ERROR_REGEX.test(firstException?.value ?? '')) {
      event.tags.lexical = true;
      const version = loadedKoenigVersion();
      if (version) {
        event.contexts.koenig = { version };
      }
    }

    return event;
  } catch {
    // A partial event is more useful than a dropped one
    return event;
  }
}
