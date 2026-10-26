import { describe, expect, it } from 'vitest';
import { getAdminKeys, getReferencedSlugs, getReferencedTopics } from './help-contract';

// The contract with the help center (help-contract.ts): what the docs team
// can tag, and what Admin expects to find there
describe('the contract with the help center', () => {
  it('lists every #admin- key, page, account alert and general, once', () => {
    const keys = getAdminKeys();
    expect(keys).toEqual(
      expect.arrayContaining(['posts', 'ghost-pro', 'payment-failed', 'general']),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('lists the article slugs and topics Admin refers to by name', () => {
    expect(getReferencedSlugs()).toEqual(
      expect.arrayContaining([
        'manage-your-subscription',
        'troubleshooting-payment-issues',
        'commenting',
      ]),
    );
    expect(getReferencedTopics()).toEqual(expect.arrayContaining(['ghost-pro', 'publishing']));
  });
});
