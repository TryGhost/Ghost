import { afterEach, describe, expect, it, vi } from 'vitest';

import * as bridge from '../src/bridge/index.ts';
import * as root from '../src/index.ts';

describe('the root entry point', () => {
  afterEach(() => {
    vi.doUnmock('zod');
    vi.resetModules();
  });

  // The lint rule checks each module the root imports; this test checks the whole import
  // graph, by reloading the root and recording whether anything imports zod.
  it('loads without zod', async () => {
    let loadedZod = false;
    vi.resetModules();
    vi.doMock('zod', () => {
      loadedZod = true;
      return {};
    });

    await expect(import('../src/index.ts')).resolves.toHaveProperty('isStartContext');
    expect(loadedZod).toBe(false);

    // Confirm the check works: the bridge's own entry point does import zod.
    await import('../src/bridge/index.ts').catch(() => {});
    expect(loadedZod).toBe(true);
  });

  it('exposes only what depends on nothing', () => {
    expect(Object.keys(root).sort()).toEqual([
      'APP_ERROR_CODES',
      'APP_ID_MAX_LENGTH',
      'ARGUMENT_MESSAGES',
      'BRIDGE_ERROR_CODES',
      'CONNECT_MESSAGE_TYPE',
      'FETCH_METHODS',
      'FETCH_RESPONSE_STATUS_MAX',
      'FETCH_RESPONSE_STATUS_MIN',
      'HELLO_MESSAGE_TYPE',
      'HOST_ERROR_CODES',
      'START_TIMEOUT_MS',
      'TITLE_MAX_LENGTH',
      'URL_MAX_LENGTH',
      'appPageUrl',
      'decodeBridgeError',
      'encodeBridgeError',
      'isConnectMessage',
      'isContainedPath',
      'isDevelopmentApp',
      'isFetchResponse',
      'isGhostOrigin',
      'isLocalhost',
      'isPlainText',
      'isRecord',
      'isReservedRequestHeader',
      'isStartContext',
      'isTheme',
      'isValidAppId',
      'methodAllowsBody',
      'movedBetween',
      'normaliseAppPath',
      'servedFrom',
      'toPlainText',
    ]);
  });

  it("shares the bridge's rules with the bridge entry point", () => {
    for (const name of [
      'APP_ERROR_CODES',
      'ARGUMENT_MESSAGES',
      'BRIDGE_ERROR_CODES',
      'CONNECT_MESSAGE_TYPE',
      'FETCH_METHODS',
      'FETCH_RESPONSE_STATUS_MAX',
      'FETCH_RESPONSE_STATUS_MIN',
      'HELLO_MESSAGE_TYPE',
      'HOST_ERROR_CODES',
      'START_TIMEOUT_MS',
      'TITLE_MAX_LENGTH',
      'decodeBridgeError',
      'encodeBridgeError',
      'isConnectMessage',
      'isContainedPath',
      'isFetchResponse',
      'isRecord',
      'isReservedRequestHeader',
      'isStartContext',
      'isTheme',
      'methodAllowsBody',
      'normaliseAppPath',
    ] as const) {
      expect(root[name], name).toBe(bridge[name]);
    }
  });
});
