import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import { isGhostOrigin } from '../../src/manifest/index.ts';

describe('isGhostOrigin', function () {
  const ghostUrls = ['https://site.example.com/', 'https://admin.example.com/ghost/'];

  it('is true for a page on the site’s or Admin’s origin, whatever its path', function () {
    assert.equal(isGhostOrigin('https://site.example.com/content/files/app.html', ghostUrls), true);
    assert.equal(isGhostOrigin('https://admin.example.com/anything', ghostUrls), true);
    assert.equal(isGhostOrigin(new URL('https://site.example.com/app/'), ghostUrls), true);
  });

  it('is false when the scheme, host or port differs', function () {
    assert.equal(isGhostOrigin('http://site.example.com/app/', ghostUrls), false);
    assert.equal(isGhostOrigin('https://app.example.com/', ghostUrls), false);
    assert.equal(isGhostOrigin('http://localhost:8787/', ['http://localhost:2368/']), false);
  });

  it('counts a page whose URL can’t be parsed as Ghost’s', function () {
    assert.equal(isGhostOrigin('not a url', ghostUrls), true);
  });

  it('counts a page as Ghost’s when a Ghost URL can’t be parsed, wherever it is', function () {
    assert.equal(isGhostOrigin('https://app.example.com/', ['not a url']), true);
    assert.equal(isGhostOrigin('https://app.example.com/', [...ghostUrls, 'not a url']), true);
  });

  it('counts a page as Ghost’s when there are no Ghost URLs to check against', function () {
    assert.equal(isGhostOrigin('https://app.example.com/', []), true);
  });
});
