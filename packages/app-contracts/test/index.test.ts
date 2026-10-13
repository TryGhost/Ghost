import { afterEach, describe, expect, it, vi } from 'vitest';

import * as bridge from '../src/bridge/index.ts';
import * as root from '../src/index.ts';

describe('the root entry point', () => {
  afterEach(() => {
    vi.doUnmock('zod');
    vi.resetModules();
  });

  // The lint rule says this of each module the root loads; this checks the whole graph, by
  // loading the root afresh and noting whether anything asks for zod.
  it('loads without zod', async () => {
    let loadedZod = false;
    vi.resetModules();
    vi.doMock('zod', () => {
      loadedZod = true;
      return {};
    });

    await expect(import('../src/index.ts')).resolves.toHaveProperty('isStartContext');
    expect(loadedZod).toBe(false);

    // The check itself would notice: the bridge's own entry point does load zod.
    await import('../src/bridge/index.ts').catch(() => {});
    expect(loadedZod).toBe(true);
  });

  it('exposes only what depends on nothing', () => {
    expect(Object.keys(root).sort()).toEqual([
      'APP_ID_MAX_LENGTH',
      'CONNECT_MESSAGE_TYPE',
      'FETCH_METHODS',
      'FETCH_RESPONSE_STATUS_MAX',
      'FETCH_RESPONSE_STATUS_MIN',
      'HELLO_MESSAGE_TYPE',
      'TITLE_MAX_LENGTH',
      'URL_MAX_LENGTH',
      'appPageUrl',
      'isConnectMessage',
      'isContainedPath',
      'isDevelopmentApp',
      'isFetchResponse',
      'isGhostOrigin',
      'isLocalhost',
      'isRecord',
      'isStartContext',
      'isTheme',
      'isValidAppId',
      'movedBetween',
      'servedFrom',
    ]);
  });

  it("shares the bridge's rules with the bridge entry point", () => {
    for (const name of [
      'CONNECT_MESSAGE_TYPE',
      'FETCH_METHODS',
      'FETCH_RESPONSE_STATUS_MAX',
      'FETCH_RESPONSE_STATUS_MIN',
      'HELLO_MESSAGE_TYPE',
      'TITLE_MAX_LENGTH',
      'isConnectMessage',
      'isContainedPath',
      'isFetchResponse',
      'isRecord',
      'isStartContext',
      'isTheme',
    ] as const) {
      expect(root[name], name).toBe(bridge[name]);
    }
  });
});
