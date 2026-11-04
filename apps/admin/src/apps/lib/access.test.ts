import { describe, expect, it } from 'vitest';
import { ADMIN_API_ALLOWLIST } from '@tryghost/app-contracts/bridge';
import { ACCOUNT_ACCESS } from './access';

describe('ACCOUNT_ACCESS', () => {
  it('lists every scope the bridge allows, each once, and no others', () => {
    const listed = ACCOUNT_ACCESS.flatMap((item) => item.scopes);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(ADMIN_API_ALLOWLIST.map((scope) => scope.name).sort());
  });
});
