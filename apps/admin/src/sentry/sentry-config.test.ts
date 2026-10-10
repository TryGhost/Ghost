import { afterEach, describe, expect, it, vi } from 'vitest';
import { inboundFiltersIntegration, replayIntegration, type Event } from '@sentry/react';
import { beforeBreadcrumb, beforeSend, getSentryConfig, type Integration } from './sentry-config';

vi.mock('@sentry/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  debugIntegration: vi.fn(() => ({ name: 'Debug' })),
}));

const koenigVersion = vi.hoisted(() => vi.fn<() => string | undefined>());

vi.mock('@/settings/components/koenig-loader', () => ({ loadedKoenigVersion: koenigVersion }));

const LEXICAL_ERROR =
  'Minified Lexical error #15; visit https://lexical.dev/docs/error?code=15 for the full message';

const DSN = 'https://public@o0.ingest.sentry.io/1';

function isIgnored(type: string, value: string): boolean {
  const config = getSentryConfig({ dsn: DSN, environment: 'production', version: '6.1' });
  const event: Event = { exception: { values: [{ type, value }] } };
  const client = { getOptions: () => config } as never;

  return inboundFiltersIntegration().processEvent?.(event, {}, client) === null;
}

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

  it('ignores browser and network noise', () => {
    const config = getSentryConfig({ dsn: DSN, environment: 'production', version: '6.1' });

    expect(config.ignoreErrors).toEqual([
      /The play\(\) request was interrupted.*/,
      /The request is not allowed by the user agent or the platform in the current context/,
      /Server was unreachable/,
      /^NetworkError when attempting to fetch resource\.$/,
      /^Failed to fetch$/,
      /^Load failed$/,
      /^(AbortError: )?The operation was aborted\. ?$/,
      /^(AbortError: |InvalidStateError: )?Transition was (skipped|aborted because of invalid state)(\. [A-Za-z ]+)?$/,
      /^(Skipping view transition because (skipTransition\(\) was called|viewport size changed)|View transition was skipped because document visibility state is hidden)\.$/,
      /^Skipped ViewTransition due to (skipTransition\(\) call|document being hidden)$/,
      /^ResizeObserver loop completed with undelivered notifications/,
      /^ResizeObserver loop limit exceeded/,
    ]);
  });

  it.each([
    ['TypeError', 'Failed to fetch'],
    ['TypeError', 'Load failed'],
    ['TypeError', 'NetworkError when attempting to fetch resource.'],
    ['AbortError', 'The operation was aborted.'],
    ['AbortError', 'The operation was aborted. '],
    ['Error', 'AbortError: The operation was aborted.'],
  ])('ignores the network error %s: %j', (type, value) => {
    expect(isIgnored(type, value)).toBe(true);
  });

  it.each([
    ['Error', 'InvalidStateError: Transition was aborted because of invalid state'],
    [
      'Error',
      'InvalidStateError: Transition was aborted because of invalid state. Document hidden',
    ],
    ['AbortError', 'Transition was skipped'],
    ['AbortError', 'Transition was skipped. Navigation aborted'],
    [
      'InvalidStateError',
      'View transition was skipped because document visibility state is hidden.',
    ],
    ['AbortError', 'Skipping view transition because skipTransition() was called.'],
    ['InvalidStateError', 'Skipping view transition because viewport size changed.'],
    ['InvalidStateError', 'Skipped ViewTransition due to document being hidden'],
    ['AbortError', 'Skipped ViewTransition due to skipTransition() call'],
  ])('ignores the skipped view transition %s: %j', (type, value) => {
    expect(isIgnored(type, value)).toBe(true);
  });

  it('reports an error that only starts like a skipped view transition', () => {
    expect(isIgnored('Error', 'Skipped ViewTransition due to document being hidden: x')).toBe(
      false,
    );
  });

  it('reports a module that failed to load', () => {
    expect(
      isIgnored(
        'TypeError',
        'Failed to fetch dynamically imported module: https://example.com/ghost/assets/editor-Bx1.js',
      ),
    ).toBe(false);
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
    koenigVersion.mockReset();
  });

  it('should return an event', () => {
    const event = { message: 'test' } as Event;

    expect(beforeSend(event)).toEqual(event);
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

    expect(beforeSend(event)).toBeNull();
  });

  it('sends failures the publish flow showed the writer', () => {
    const event = { tags: { shown_to_user: true, source: 'publish-flow' } } as Event;

    expect(beforeSend(event)).toEqual(event);
  });

  it('removes post and page ids from the error message', () => {
    const event = {
      exception: { values: [{ value: 'Something went wrong <post:123>' }] },
    } as Event;

    expect(beforeSend(event)?.exception?.values?.[0]?.value).toBe('Something went wrong <post:ID>');
  });

  it('removes page ids from the error message', () => {
    const event = {
      exception: { values: [{ value: 'Could not save <page:abc123>' }] },
    } as Event;

    expect(beforeSend(event)?.exception?.values?.[0]?.value).toBe('Could not save <page:ID>');
  });

  it('tags an uncaught Lexical error with the loaded Koenig version', () => {
    koenigVersion.mockReturnValue('1.2.3');
    const event = { exception: { values: [{ value: LEXICAL_ERROR }] } } as Event;

    const result = beforeSend(event);

    expect(result?.tags?.lexical).toBe(true);
    expect(result?.contexts?.koenig).toEqual({ version: '1.2.3' });
  });

  it('tags a Lexical error before Koenig has loaded without a version', () => {
    const event = { exception: { values: [{ value: LEXICAL_ERROR }] } } as Event;

    const result = beforeSend(event);

    expect(result?.tags?.lexical).toBe(true);
    expect(result?.contexts?.koenig).toBeUndefined();
  });

  it('keeps the context of a Lexical error the editor reported', () => {
    koenigVersion.mockReturnValue('1.2.3');
    const event = {
      exception: { values: [{ value: LEXICAL_ERROR }] },
      tags: { lexical: true, koenig_instance: 'secondary' },
      contexts: { koenig: { version: '1.0.0' } },
    } as Event;

    const result = beforeSend(event);

    expect(result?.tags).toMatchObject({ lexical: true, koenig_instance: 'secondary' });
    expect(result?.contexts?.koenig).toEqual({ version: '1.0.0' });
  });

  it('does not tag other errors as Lexical', () => {
    koenigVersion.mockReturnValue('1.2.3');
    const event = { exception: { values: [{ value: 'Lexical node not found' }] } } as Event;

    const result = beforeSend(event);

    expect(result?.tags?.lexical).toBeUndefined();
    expect(result?.contexts?.koenig).toBeUndefined();
  });

  it('returns the original event if there is an error', () => {
    const event = {
      exception: { values: [{ value: 'Failed' }] },
      get tags(): never {
        throw new Error('test');
      },
    } as unknown as Event;

    expect(beforeSend(event)).toBe(event);
  });

  it('skips reporting e.ghost.org requests', () => {
    const event = { request: { url: 'https://e.ghost.org/pg/injest/i/v0/e/' } } as Event;

    expect(beforeSend(event)).toBeNull();
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
