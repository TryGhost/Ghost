import * as contracts from '@tryghost/app-contracts/bridge';
import { describe, expect, expectTypeOf, it } from 'vitest';

import manifest from '../package.json' with { type: 'json' };
import * as sdk from '../src/index.ts';
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

  it('gives errors a name and a code', () => {
    const cause = new Error('underneath');
    const error = new sdk.GhostAppError('blocked', 'No', { cause });
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ name: 'GhostAppError', code: 'blocked', message: 'No', cause });
  });
});
