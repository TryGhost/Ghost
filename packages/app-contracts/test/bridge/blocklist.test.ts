import { describe, expect, it } from 'vitest';

import { ADMIN_API_BLOCKLIST, isBlockedAdminApiPath } from '../../src/bridge/blocklist.ts';
import { FETCH_METHODS } from '../../src/bridge/rules.ts';

describe('the Admin API blocklist', () => {
  it('gives every category a name, a reason and paths', () => {
    expect(ADMIN_API_BLOCKLIST.map((category) => category.name)).toEqual([
      'staff_accounts',
      'integrations',
      'identity_tokens',
      'sessions',
      'members',
      'member_details',
      'gift_links',
      'settings',
      'uploads',
      'bulk_deletes',
      'invites',
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
    staff_accounts: [
      '/users/5ddc9141c35e7700383b2937/',
      '/users/5ddc9141c35e7700383b2937/token/',
      '/users/1/token',
      '/users/me/',
      '/users/slug/jamie/',
      '/users/password/',
      '/users/owner/',
    ],
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
    members: [
      '/members/',
      '/members/?filter=status:paid',
      '/members/5ddc9141c35e7700383b2937/',
      '/members/5ddc9141c35e7700383b2937/signin_urls/',
      '/members/5ddc9141c35e7700383b2937/sessions/',
      '/members/bulk/',
      '/members/upload/',
      '/members/stats/count/',
      '/members/events/',
      '/members/stripe_connect/',
      '/members/metafields/custom/',
      '/labels/',
      '/labels/slug/vip/',
    ],
    member_details: [
      '/comments/',
      '/comments/abc/replies/',
      '/comments/post/abc/',
      '/feedback/abc/',
      '/emails/abc/recipient-failures/',
      '/automations/abc/runs/',
      '/automations/abc/runs/def/',
    ],
    gift_links: [
      '/posts/5ddc9141c35e7700383b2937/gift_links/',
      '/pages/5ddc9141c35e7700383b2937/gift_links/',
      '/gift_links/remove_all/',
    ],
    settings: [
      '/settings/',
      '/settings',
      '/settings/?group=site',
      '/settings/access_code/regenerate/',
      '/settings/routes/yaml/',
      '/settings/stripe/connect/',
      '/settings/verifications/',
    ],
    uploads: [
      '/images/upload/',
      '/media/upload/',
      '/media/thumbnail/upload/',
      '/files/upload/',
      '/themes/upload/',
      '/redirects/upload/',
      '/posts/upload/',
    ],
    bulk_deletes: ['/posts/', '/posts/?filter=tag:news', '/pages/', '/PAGES'],
    invites: ['/invites/', '/invites/abc/'],
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
    const { methods = FETCH_METHODS } = ADMIN_API_BLOCKLIST.find(
      (category) => category.name === name,
    )!;
    it(`blocks ${name} for ${methods.length === FETCH_METHODS.length ? 'every method' : methods.join(', ')}`, () => {
      for (const path of paths) {
        for (const method of methods) {
          expect(isBlockedAdminApiPath(path, method), `${method} ${path}`).toBe(true);
        }
      }
    });
  }

  it('leaves listing posts and pages, and deleting one at a time, open', () => {
    for (const [method, path] of [
      ['GET', '/posts/'],
      ['GET', '/pages/?filter=status:draft'],
      ['POST', '/posts/'],
      ['DELETE', '/posts/5ddc9141c35e7700383b2937/'],
      ['DELETE', '/pages/5ddc9141c35e7700383b2937/'],
    ] as const) {
      expect(isBlockedAdminApiPath(path, method), `${method} ${path}`).toBe(false);
    }
  });

  it('leaves the rest of the Admin API open', () => {
    for (const path of [
      '/',
      '',
      '/posts/',
      '/posts/abc/',
      '/users/',
      '/users/?filter=id:abc',
      '/users/?filter=id:abc&include=roles',
      '/tinybird/token/extra/',
      '/config/',
      '/site/',
      '/tinybird/',
      '/database/',
      '/dbx/',
      '/webhook/',
      '/sessions/',
      '/application/',
      '/posts/db/',
      '/custom_theme_settings/',
      '/posts/settings/',
      '/images/',
      '/files/',
      '/themes/',
      '/themes/install/?source=github&ref=TryGhost/Casper',
      '/redirects/download/',
      '/posts/export/',
      '/posts/gift_links/',
      '/tags/',
      '/tiers/',
      '/offers/',
      '/newsletters/',
      '/stats/member_count/',
      '/emails/abc/',
      '/emails/abc/batches/',
      '/automations/',
      '/automations/abc/',
      '/posts/abc/comments/',
    ]) {
      expect(isBlockedAdminApiPath(path, 'GET'), path).toBe(false);
    }
  });

  it('reads paths the way the router does: any case, with or without a trailing slash', () => {
    for (const path of ['/db', '/db/', '/DB/', '/Db', '/USERS/abc/TOKEN', '/Apps/Installations/']) {
      expect(isBlockedAdminApiPath(path, 'GET'), path).toBe(true);
    }
  });

  it('ignores a query string or fragment', () => {
    expect(isBlockedAdminApiPath('/db/?include=all', 'GET')).toBe(true);
    expect(isBlockedAdminApiPath('/db?x=1', 'GET')).toBe(true);
    expect(isBlockedAdminApiPath('/db#x', 'GET')).toBe(true);
    expect(isBlockedAdminApiPath('/posts/?path=/db/', 'GET')).toBe(false);
    expect(isBlockedAdminApiPath('/posts/#/db/', 'GET')).toBe(false);
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
      expect(isBlockedAdminApiPath(path, 'GET'), path).toBe(true);
    }
  });

  it('blocks paths whose destination depends on which parser reads them', () => {
    for (const path of [
      '/posts/../db/',
      '/posts/%2e%2e/db/',
      '/posts/./',
      '/posts/..',
      '/%',
      '/posts/%zz/',
      '/posts/%E0%A4%A/',
    ]) {
      expect(isBlockedAdminApiPath(path, 'GET'), path).toBe(true);
    }
  });
});
