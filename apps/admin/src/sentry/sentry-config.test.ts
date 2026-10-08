import { afterEach, describe, expect, it, vi } from 'vitest';
import { replayIntegration, type Event } from '@sentry/react';
import { beforeBreadcrumb, beforeSend, getSentryConfig, type Integration } from './sentry-config';

vi.mock('@sentry/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  debugIntegration: vi.fn(() => ({ name: 'Debug' })),
}));

const DSN = 'https://public@o0.ingest.sentry.io/1';

function integrationNames(environment: string): string[] {
  const config = getSentryConfig({ dsn: DSN, environment, version: '6.1' });
  const defaults = [{ name: 'Dedupe' }, { name: 'GlobalHandlers' }] as Integration[];
  const integrations = config.integrations as (defaults: Integration[]) => Integration[];
  return integrations(defaults).map((integration) => integration.name);
}

describe('getSentryConfig', () => {
  it('releases as ghost@<version> to the given DSN and environment', () => {
    const config = getSentryConfig({ dsn: DSN, environment: 'production', version: '6.1' });

    expect(config).toMatchObject({ dsn: DSN, environment: 'production', release: 'ghost@6.1' });
  });

  it('ignores browser, network and Ember noise', () => {
    const config = getSentryConfig({ dsn: DSN, environment: 'production', version: '6.1' });

    expect(config.ignoreErrors).toEqual([
      /The play\(\) request was interrupted.*/,
      /The request is not allowed by the user agent or the platform in the current context/,
      /Server was unreachable/,
      /NetworkError when attempting to fetch resource./,
      /Failed to fetch/,
      /Load failed/,
      /The operation was aborted./,
      /^TransitionAborted$/,
      /^ResizeObserver loop completed with undelivered notifications/,
      /^ResizeObserver loop limit exceeded/,
      'TaskCancelation',
    ]);
  });

  it('buffers replays for errors and keeps deduping outside tests', () => {
    const config = getSentryConfig({ dsn: DSN, environment: 'production', version: '6.1' });

    expect(config.replaysOnErrorSampleRate).toBe(0.5);
    expect(config.replaysSessionSampleRate).toBeUndefined();
    expect(integrationNames('production')).toEqual(['Dedupe', 'GlobalHandlers', 'Replay']);
  });

  it('masks Lexical, inputs and Automations and blocks media in replays', () => {
    vi.mocked(replayIntegration).mockClear();

    getSentryConfig({ dsn: DSN, environment: 'production', version: '6.1' });

    expect(replayIntegration).toHaveBeenCalledExactlyOnceWith({
      mask: ['.koenig-lexical', '.gh-dashboard', '[data-sentry-automations-mask]'],
      unmask: [
        'body:not([data-sentry-automations-mask]) [role="menu"]',
        'body:not([data-sentry-automations-mask]) [data-testid="settings-panel"]',
        'body:not([data-sentry-automations-mask]) .gh-nav',
      ],
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: true,
    });
  });

  it('adds debug logging in development', () => {
    expect(integrationNames('development')).toEqual([
      'Dedupe',
      'GlobalHandlers',
      'Replay',
      'Debug',
    ]);
  });

  it('records no replays and keeps identical events when testing', () => {
    const config = getSentryConfig({ dsn: DSN, environment: 'testing', version: '6.1' });

    expect(config.replaysOnErrorSampleRate).toBeUndefined();
    expect(integrationNames('testing')).toEqual(['GlobalHandlers']);
  });
});

describe('beforeSend', () => {
  afterEach(() => {
    document.body.removeAttribute('data-gr-ext-installed');
  });

  it('should return an event', () => {
    const event = { message: 'test' } as Event;

    expect(beforeSend(event, {})).toEqual(event);
  });

  it('tags events as not shown to the user by default', () => {
    expect(beforeSend({})?.tags).toEqual({ shown_to_user: false, grammarly: false });
  });

  it('tags events raised while Grammarly is installed', () => {
    document.body.setAttribute('data-gr-ext-installed', '');

    expect(beforeSend({})?.tags?.grammarly).toBe(true);
  });

  it('does not send the event if it was shown to the user', () => {
    const event = { tags: { shown_to_user: true } } as Event;

    expect(beforeSend(event, {})).toBeNull();
  });

  it('removes post and page ids from the error message', () => {
    const event = {
      exception: { values: [{ value: 'Something went wrong <post:123>' }] },
    } as Event;

    expect(beforeSend(event, {})?.exception?.values?.[0]?.value).toBe(
      'Something went wrong <post:ID>',
    );
  });

  it('removes page ids from the error message', () => {
    const event = {
      exception: { values: [{ value: 'Could not save <page:abc123>' }] },
    } as Event;

    expect(beforeSend(event, {})?.exception?.values?.[0]?.value).toBe('Could not save <page:ID>');
  });

  it('returns the original event if there is an error', () => {
    const event = {
      exception: { values: [{ value: 'Failed' }] },
    } as Event;
    const hint = {
      originalException: {
        get payload(): never {
          throw new Error('test');
        },
      },
    };

    expect(beforeSend(event, hint)).toBe(event);
  });

  it('returns the event even if the ajax error is missing values', () => {
    const event = { exception: { values: [] } } as Event;
    const hint = { originalException: { payload: { errors: [] } } };

    expect(beforeSend(event, hint)).toEqual(event);
  });

  it('describes ember-ajax errors by their API error', () => {
    const event = {
      exception: { values: [{ type: 'AjaxError', value: 'Ajax operation failed' }] },
      contexts: { ajax: { status: 422 } },
      tags: { ajax_status: '422' },
    } as unknown as Event;
    const hint = {
      originalException: {
        payload: {
          errors: [{ type: 'ValidationError', context: 'Title too long', message: 'Invalid' }],
        },
      },
    };

    const result = beforeSend(event, hint);

    expect(result?.exception?.values?.[0]).toEqual({
      type: 'ValidationError: Title too long',
      value: 'Invalid',
      context: 'Title too long',
    });
    expect(result?.contexts?.ajax).toEqual({ status: 422 });
    expect(result?.tags?.ajax_status).toBe('422');
  });

  it('removes ajax tags and context if it is not an ajax error', () => {
    const event = {
      tags: {
        ajax_status: 'test status',
        ajax_method: 'test method',
        ajax_url: 'test url',
      },
      contexts: { ajax: { status: 'test context' } },
    } as Event;
    const hint = { originalException: { payload: { errors: [] } } };

    const result = beforeSend(event, hint);

    expect(result?.tags?.ajax_status).toBeUndefined();
    expect(result?.tags?.ajax_method).toBeUndefined();
    expect(result?.tags?.ajax_url).toBeUndefined();
    expect(result?.contexts?.ajax).toBeUndefined();
  });

  it('skips reporting e.ghost.org requests', () => {
    const event = { request: { url: 'https://e.ghost.org/pg/injest/i/v0/e/' } } as Event;
    const hint = { originalException: { payload: { errors: [] } } };

    expect(beforeSend(event, hint)).toBeNull();
  });

  it('skips reporting plausible requests', () => {
    const event = { request: { url: 'https://plausible.io/api/event' } } as Event;

    expect(beforeSend(event)).toBeNull();
  });
});

describe('beforeBreadcrumb', () => {
  it.each(['https://e.ghost.org/pg/injest/i/v0/e/', 'https://plausible.io/api/event'])(
    'drops http breadcrumbs for %s',
    (url) => {
      expect(beforeBreadcrumb({ category: 'http', data: { url } })).toBeNull();
    },
  );

  it('keeps other breadcrumbs', () => {
    const breadcrumb = { category: 'http', data: { url: '/ghost/api/admin/posts/' } };

    expect(beforeBreadcrumb(breadcrumb)).toBe(breadcrumb);
    expect(beforeBreadcrumb({ category: 'ui.click' })).toEqual({ category: 'ui.click' });
  });

  it('keeps non-http breadcrumbs for filtered URLs', () => {
    const breadcrumb = { category: 'navigation', data: { url: 'https://plausible.io/api/event' } };

    expect(beforeBreadcrumb(breadcrumb)).toBe(breadcrumb);
  });
});
