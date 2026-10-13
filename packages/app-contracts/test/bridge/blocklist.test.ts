import { describe, expect, it } from 'vitest';

import { ADMIN_API_BLOCKLIST, isBlockedAdminApiPath } from '../../src/bridge/index.ts';

describe('the Admin API blocklist', () => {
  it('gives every category a name, a reason and paths', () => {
    expect(ADMIN_API_BLOCKLIST.map((category) => category.name)).toEqual([
      'staff_tokens',
      'integrations',
      'identity_tokens',
      'sessions',
      'invites',
      'password_and_ownership',
      'webhooks',
      'database',
      'third_party_tokens',
      'apps',
    ]);
    for (const category of ADMIN_API_BLOCKLIST) {
      expect(category.reason).not.toBe('');
      expect(category.paths.length).toBeGreaterThan(0);
    }
  });

  // One real route per category, as Ghost core's admin routes write them.
  const blocked: Record<string, string[]> = {
    staff_tokens: ['/users/5ddc9141c35e7700383b2937/token/', '/users/1/token'],
    integrations: [
      '/integrations/',
      '/integrations/abc/',
      '/integrations/abc/api_key/def/refresh/',
    ],
    identity_tokens: ['/identities/', '/identities/abc/'],
    sessions: [
      '/session/',
      '/session/verify/',
      '/authentication/password_reset/',
      '/authentication/setup/',
      '/authentication/invitation/',
      '/authentication',
    ],
    invites: ['/invites/', '/invites/abc/'],
    password_and_ownership: ['/users/password/', '/users/owner/'],
    webhooks: ['/webhooks/', '/webhooks/abc/'],
    database: ['/db/', '/db/backup/', '/db/media/inline/', '/exports/', '/exports/download/'],
    third_party_tokens: ['/tinybird/token/', '/featurebase/token/', '/config/featurebase/'],
    apps: [
      '/apps/',
      '/apps/installations/',
      '/apps/installations/abc/',
      '/apps/installations/abc/sessions/',
      '/apps/installations/preview/',
    ],
  };

  it('has an example for every category', () => {
    expect(Object.keys(blocked)).toEqual(ADMIN_API_BLOCKLIST.map((category) => category.name));
  });

  for (const [name, paths] of Object.entries(blocked)) {
    it(`blocks ${name}`, () => {
      for (const path of paths) {
        expect(isBlockedAdminApiPath(path), path).toBe(true);
      }
    });
  }

  it('leaves the rest of the Admin API open', () => {
    for (const path of [
      '/',
      '',
      '/posts/',
      '/posts/abc/',
      '/members/',
      '/users/',
      '/users/abc/',
      '/users/me/',
      '/users/abc/token/extra/',
      '/users/abc/tokens/',
      '/users/x/tokens-stats',
      '/users/passwords/',
      '/config/',
      '/site/',
      '/settings/',
      '/tinybird/',
      '/database/',
      '/dbx/',
      '/webhook/',
      '/sessions/',
      '/application/',
      '/posts/db/',
      '/members/abc/sessions/',
    ]) {
      expect(isBlockedAdminApiPath(path), path).toBe(false);
    }
  });

  it('reads paths the way the router does: any case, with or without a trailing slash', () => {
    for (const path of ['/db', '/db/', '/DB/', '/Db', '/USERS/abc/TOKEN', '/Apps/Installations/']) {
      expect(isBlockedAdminApiPath(path), path).toBe(true);
    }
  });

  it('ignores a query string or fragment', () => {
    expect(isBlockedAdminApiPath('/db/?include=all')).toBe(true);
    expect(isBlockedAdminApiPath('/db?x=1')).toBe(true);
    expect(isBlockedAdminApiPath('/db#x')).toBe(true);
    expect(isBlockedAdminApiPath('/posts/?path=/db/')).toBe(false);
    expect(isBlockedAdminApiPath('/posts/#/db/')).toBe(false);
  });

  it('blocks paths that only reach a route once decoded or collapsed', () => {
    for (const path of [
      '/%64b/',
      '/%44%42',
      '/users%2fpassword',
      '/users//password/',
      '//db',
      '/apps%2Finstallations',
    ]) {
      expect(isBlockedAdminApiPath(path), path).toBe(true);
    }
  });

  it('blocks paths whose destination depends on who reads them', () => {
    for (const path of [
      '/posts/../db/',
      '/posts/%2e%2e/db/',
      '/posts/./',
      '/posts/..',
      '/%',
      '/posts/%zz/',
      '/posts/%E0%A4%A/',
    ]) {
      expect(isBlockedAdminApiPath(path), path).toBe(true);
    }
  });
});
