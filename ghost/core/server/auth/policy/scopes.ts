import type { Capabilities, Capability } from './capabilities';

/** Whether the scopes allow the key. Finer scopes come with PLA-639. */
export function scopesAllow(scopes: Capabilities['scopes'], key: Capability): boolean {
  return scopes === 'unlimited' || scopes.has(key);
}
