import assert from 'node:assert/strict';
import { GhostUrlUtils } from '../../../core/shared/url-utils';

function urlUtils(siteUrl: string, adminUrl?: string) {
  return new GhostUrlUtils({
    getSubdir: () => new URL(siteUrl).pathname.replace(/\/$/, ''),
    getSiteUrl: () => siteUrl,
    getAdminUrl: () => adminUrl as string,
    baseApiPath: '/ghost/api',
  });
}

describe('urlUtils.getAdminOrigin', function () {
  it('returns the admin URL origin, without its path', function () {
    assert.equal(
      urlUtils('https://example.com/', 'https://admin.example.com/blog/').getAdminOrigin(),
      'https://admin.example.com',
    );
  });

  it('falls back to the site URL origin when no admin URL is configured', function () {
    assert.equal(urlUtils('https://example.com/blog/').getAdminOrigin(), 'https://example.com');
  });
});
