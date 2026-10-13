import { describe, expect, expectTypeOf, it } from 'vitest';

import * as bridge from '../../src/bridge/index.ts';
import type { AppExports, HostExports } from '../../src/bridge/index.ts';

describe('the bridge entry point', () => {
  it('exposes the contract and nothing else', () => {
    expect(Object.keys(bridge).sort()).toEqual([
      'ADMIN_API_BLOCKLIST',
      'APP_PATH_MAX_LENGTH',
      'AppPathSchema',
      'CONNECT_MESSAGE_TYPE',
      'ConnectMessageSchema',
      'FETCH_BODY_MAX_BYTES',
      'FETCH_METHODS',
      'FETCH_PATH_MAX_LENGTH',
      'FETCH_RESPONSE_STATUS_MAX',
      'FETCH_RESPONSE_STATUS_MIN',
      'FetchRequestSchema',
      'FetchResponseSchema',
      'HELLO_MESSAGE_TYPE',
      'HelloMessageSchema',
      'PathChangeOptionsSchema',
      'PlaceSchema',
      'StartContextSchema',
      'TITLE_MAX_LENGTH',
      'ThemeSchema',
      'TitleSchema',
      'isBlockedAdminApiPath',
      'isConnectMessage',
      'isContainedPath',
      'isFetchResponse',
      'isRecord',
      'isStartContext',
      'isTheme',
      'resolveAdminApiPath',
    ]);
  });

  it('only ever exposes calls that return promises', () => {
    type Returns<T> = { [K in keyof T]: T[K] extends (...args: never[]) => infer R ? R : never };
    expectTypeOf<Returns<HostExports>[keyof HostExports]>().toExtend<Promise<unknown>>();
    expectTypeOf<Returns<AppExports>[keyof AppExports]>().toExtend<Promise<unknown>>();
    expectTypeOf<HostExports>().toHaveProperty('fetch');
    expectTypeOf<HostExports>().toHaveProperty('titleChanged');
    expectTypeOf<HostExports>().toHaveProperty('pathChanged');
    expectTypeOf<HostExports>().toHaveProperty('open');
    expectTypeOf<AppExports>().toHaveProperty('start');
    expectTypeOf<AppExports>().toHaveProperty('themeChanged');
    expectTypeOf<AppExports>().toHaveProperty('pathChanged');
  });
});
