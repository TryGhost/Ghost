import { describe, expect, it } from 'vitest';

import * as root from '../src/index.ts';

describe('the root entry point', () => {
  it('exposes only what depends on nothing', () => {
    expect(Object.keys(root).sort()).toEqual([
      'APP_ID_MAX_LENGTH',
      'URL_MAX_LENGTH',
      'isDevelopmentApp',
      'isLocalhost',
      'isValidAppId',
      'movedBetween',
      'servedFrom',
    ]);
  });
});
