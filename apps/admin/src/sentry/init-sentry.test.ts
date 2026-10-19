import { afterEach, describe, expect, it } from 'vitest';
import * as Sentry from '@sentry/react';
import { getAdminBuild, initSentry } from './init-sentry';

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

describe('getAdminBuild', () => {
  it('reads the build from a Ghost(Pro) asset URL', () => {
    expect(
      getAdminBuild(
        'https://assets.ghost.io/admin/043a3af489870c88fc1fd8bd9874e68d88258af9/assets/index-B1a2c3.js',
      ),
    ).toBe('043a3af489870c88fc1fd8bd9874e68d88258af9');
  });

  it('is absent for assets served by Ghost', () => {
    expect(getAdminBuild('https://example.com/ghost/assets/index-B1a2c3.js')).toBeUndefined();
  });
});
