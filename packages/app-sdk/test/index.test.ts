import * as contracts from '@tryghost/app-contracts/bridge';
import { describe, expect, expectTypeOf, it } from 'vitest';

import manifest from '../package.json' with { type: 'json' };
import * as sdk from '../src/index.ts';
import {
  CONNECT_MESSAGE_TYPE,
  FETCH_METHODS,
  HELLO_MESSAGE_TYPE,
  TITLE_MAX_LENGTH,
} from '../src/protocol.ts';
import { SDK_VERSION } from '../src/version.ts';

describe('@tryghost/app-sdk', () => {
  it('exports connect and its error, and nothing else at runtime', () => {
    expect(Object.keys(sdk).sort()).toEqual(['GhostAppError', 'connect']);
  });

  it('exports the context types as the contract defines them', () => {
    expectTypeOf<sdk.StartContext>().toEqualTypeOf<contracts.StartContext>();
    expectTypeOf<sdk.Theme>().toEqualTypeOf<contracts.Theme>();
    expectTypeOf<sdk.Place>().toEqualTypeOf<contracts.Place>();
    expectTypeOf<sdk.Site>().toEqualTypeOf<contracts.StartContext['site']>();
  });

  it('says hello with the version in package.json', () => {
    expect(SDK_VERSION).toBe(manifest.version);
  });

  // The SDK copies these rather than loading the contract at runtime.
  it('uses the values the contract defines', () => {
    expect(HELLO_MESSAGE_TYPE).toBe(contracts.HELLO_MESSAGE_TYPE);
    expect(CONNECT_MESSAGE_TYPE).toBe(contracts.CONNECT_MESSAGE_TYPE);
    expect(TITLE_MAX_LENGTH).toBe(contracts.TITLE_MAX_LENGTH);
    expect(FETCH_METHODS).toEqual(contracts.FETCH_METHODS);
  });

  it('gives errors a name and a code', () => {
    const cause = new Error('underneath');
    const error = new sdk.GhostAppError('blocked', 'No', { cause });
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ name: 'GhostAppError', code: 'blocked', message: 'No', cause });
  });
});
