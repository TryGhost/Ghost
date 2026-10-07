import * as Sentry from '@sentry/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  type EndpointCapture,
  configResponse,
  fakeAdminEndpoint,
  fakeEndpoint,
  fakeMembers,
  fakeTags,
  member,
  renderAdminApp,
  settleRequests,
  siteResponse,
} from '@test-utils/acceptance';

const SENTRY_DSN = 'https://public@o0.ingest.sentry.io/1';
const ENVELOPE_URL = 'https://o0.ingest.sentry.io/api/1/envelope/';

interface EnvelopeItem {
  type: string;
  payload: Record<string, unknown>;
}

/** Sentry envelopes are NDJSON: an envelope header, then a header and payload line per item. */
function envelopeItems(ingest: EndpointCapture): EnvelopeItem[] {
  return ingest.requests.flatMap(({ body }) => {
    const [, ...lines] = String(body).split('\n');
    const items: EnvelopeItem[] = [];
    for (let index = 0; index + 1 < lines.length; index += 2) {
      const { type } = JSON.parse(lines[index]) as { type: string };
      items.push({ type, payload: JSON.parse(lines[index + 1]) as Record<string, unknown> });
    }
    return items;
  });
}

function handledErrorEvents(ingest: EndpointCapture): Sentry.Event[] {
  return envelopeItems(ingest)
    .filter(({ type }) => type === 'event')
    .map(({ payload }) => payload as Sentry.Event)
    .filter(({ tags }) => tags?.source === 'useHandleError');
}

function sentryBoot() {
  const site = siteResponse();
  site.site.sentry_dsn = SENTRY_DSN;
  site.site.sentry_env = 'testing';
  const config = configResponse();
  config.config.version = '6.52.1';
  return { browseSite: { response: site }, browseConfig: { response: config } };
}

describe('Sentry', () => {
  afterEach(async () => {
    // Flush while the ingest fake is still registered, then unbind the closed client
    await Sentry.close();
    const hub = Sentry.getCurrentHub();
    hub.bindClient(undefined);
    hub.getScope().clear();
    hub.getIsolationScope().clear();
  });

  it('stays off when the site has no DSN', async () => {
    fakeTags([]);

    await renderAdminApp('/tags');
    await settleRequests();

    expect(Sentry.getClient()).toBeUndefined();
  });

  it('reports to the site DSN with the release, role and route', async () => {
    fakeTags([]);
    const ingest = fakeEndpoint('POST', ENVELOPE_URL, {});

    await renderAdminApp('/tags', { boot: sentryBoot() });

    await expect
      .poll(() => envelopeItems(ingest).some(({ type }) => type === 'session'))
      .toBe(true);
    expect(ingest.lastRequest?.url).toContain('sentry_key=public');
    const session = envelopeItems(ingest).find(({ type }) => type === 'session');
    expect(session?.payload.attrs).toMatchObject({ release: 'ghost@x.x', environment: 'testing' });

    await settleRequests();
    Sentry.captureMessage('Acceptance probe');

    await expect
      .poll(() => envelopeItems(ingest).find(({ type }) => type === 'event')?.payload)
      .toMatchObject({
        message: 'Acceptance probe',
        environment: 'testing',
        release: 'ghost@6.52.1',
        user: { role: 'Owner' },
        tags: { route: '/tags', shown_to_user: false },
      });
  });

  it('reports handled errors the user was not shown', async () => {
    fakeMembers([member({ name: 'First Member' })]);
    // The newsletters schema rejects this response
    fakeAdminEndpoint('GET', /^\/newsletters\//, { newsletters: [{}] });
    const offersApi = fakeAdminEndpoint(
      'GET',
      /^\/offers\//,
      { errors: [{ message: 'Offers could not be loaded.' }] },
      { status: 400 },
    );
    const ingest = fakeEndpoint('POST', ENVELOPE_URL, {});

    await renderAdminApp('/members', { boot: sentryBoot() });

    await expect
      .poll(() => handledErrorEvents(ingest)[0])
      .toMatchObject({
        exception: { values: [{ type: 'ZodError' }] },
        tags: { source: 'useHandleError', shown_to_user: false },
      });
    await expect.poll(() => offersApi.requests.length).toBeGreaterThan(0);
    await settleRequests();
    await Sentry.flush();
    expect(handledErrorEvents(ingest).filter(({ tags }) => tags?.api_url)).toEqual([]);
  });
});
