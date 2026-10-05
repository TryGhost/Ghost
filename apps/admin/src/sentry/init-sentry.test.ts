import { afterEach, describe, expect, it } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry } from './init-sentry';

const input = {
  dsn: 'https://public@o0.ingest.sentry.io/1',
  environment: 'testing',
  version: '6.1',
  transport: (options: Parameters<typeof Sentry.createTransport>[0]) =>
    Sentry.createTransport(options, () => Promise.resolve({ statusCode: 200 })),
};

describe('initSentry', () => {
  afterEach(async () => {
    await Sentry.close();
    const hub = Sentry.getCurrentHub();
    hub.bindClient(undefined);
    hub.getScope().clear();
    hub.getIsolationScope().clear();
  });

  it('keeps a live client', () => {
    initSentry(input);
    const client = Sentry.getClient();

    initSentry(input);
    expect(client).toBeDefined();
    expect(Sentry.getClient()).toBe(client);
  });

  it('replaces a closed client', async () => {
    initSentry(input);
    const closedClient = Sentry.getClient();
    await Sentry.close();

    initSentry(input);
    expect(Sentry.getClient()).toBeDefined();
    expect(Sentry.getClient()).not.toBe(closedClient);
  });
});
