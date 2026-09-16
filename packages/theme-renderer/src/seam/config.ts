/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Plain-object config port. Mirrors nconf's `:`-separated key lookup used by
 * Ghost's shared/config, over an injected plain object (spec principle #5:
 * "Config is a plain object").
 */
import type { ConfigPort } from './types.ts';

export function createConfig(values: Record<string, any> = {}): ConfigPort {
  function get(key: string): any {
    const segments = key.split(':');
    let current: any = values;
    for (const segment of segments) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[segment];
    }
    return current;
  }

  return {
    get,
    // mirrors shared/config/helpers.ts isPrivacyDisabled
    isPrivacyDisabled(key: string) {
      const privacy = get('privacy');
      if (!privacy) {
        return false;
      }
      // CASE: disable all privacy features
      if (privacy.useTinfoil === true) {
        // CASE: you can still enable single features
        if (privacy[key] === true) {
          return false;
        }
        return true;
      }
      return privacy[key] === false;
    },
  };
}
