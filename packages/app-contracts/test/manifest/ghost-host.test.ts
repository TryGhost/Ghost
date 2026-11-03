import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import { isGhostHost } from '../../src/manifest/index.ts';

describe('isGhostHost', function () {
  const ghostUrls = ['https://site.example.com/', 'https://admin.example.com/ghost/'];

  it('is true for a page on the site’s or Admin’s origin, whatever its path', function () {
    assert.equal(isGhostHost('https://site.example.com/content/files/app.html', ghostUrls), true);
    assert.equal(isGhostHost('https://admin.example.com/anything', ghostUrls), true);
    assert.equal(isGhostHost(new URL('https://site.example.com/app/'), ghostUrls), true);
  });

  it('is true on another port or scheme of the same host, which is sent the same cookies', function () {
    assert.equal(isGhostHost('https://site.example.com:8443/app/', ghostUrls), true);
    assert.equal(isGhostHost('https://admin.example.com:8443/app/', ghostUrls), true);
    assert.equal(isGhostHost('http://site.example.com/app/', ghostUrls), true);
    assert.equal(isGhostHost('http://localhost:5173/', ['http://localhost:2368/']), true);
  });

  it('reads the host as the URL parser does, without a trailing dot', function () {
    assert.equal(isGhostHost('https://SITE.Example.COM/app/', ghostUrls), true);
    assert.equal(isGhostHost('https://site.example.com./app/', ghostUrls), true);
    assert.equal(isGhostHost('https://site.example.com/', ['https://Site.Example.com./']), true);
    assert.equal(isGhostHost('https://xn--bcher-kva.example/', ['https://bücher.example/']), true);
    assert.equal(
      isGhostHost('https://BÜCHER.example:8443/', ['https://xn--bcher-kva.example/']),
      true,
    );
    assert.equal(isGhostHost('http://127.1:5173/', ['http://127.0.0.1:2368/']), true);
  });

  it('is false for another host, a sibling subdomain included', function () {
    assert.equal(isGhostHost('https://app.example.com/', ghostUrls), false);
    assert.equal(isGhostHost('https://podcast.site.example.com/', ghostUrls), false);
    assert.equal(isGhostHost('https://example.com/', ghostUrls), false);
  });

  it('is false for another name for the same machine, which browsers treat as another host', function () {
    assert.equal(isGhostHost('http://127.0.0.1:5173/', ['http://localhost:2368/']), false);
    assert.equal(isGhostHost('http://localhost:5173/', ['http://127.0.0.1:2368/']), false);
    assert.equal(isGhostHost('http://[::1]:5173/', ['http://localhost:2368/']), false);
  });

  it('counts a URL that isn’t http or https as Ghost’s', function () {
    assert.equal(isGhostHost('not a url', ghostUrls), true);
    assert.equal(isGhostHost('about:blank', ghostUrls), true);
    assert.equal(isGhostHost('ftp://app.example.com/', ghostUrls), true);
  });

  it('counts a URL as Ghost’s when a Ghost URL isn’t http or https, wherever it is', function () {
    assert.equal(isGhostHost('https://app.example.com/', ['not a url']), true);
    assert.equal(isGhostHost('https://app.example.com/', [...ghostUrls, 'not a url']), true);
    assert.equal(isGhostHost('https://app.example.com/', ['about:blank']), true);
    assert.equal(isGhostHost('https://app.example.com/', ['http://./']), true);
  });

  it('counts a URL as Ghost’s when there are no Ghost URLs to check against', function () {
    assert.equal(isGhostHost('https://app.example.com/', []), true);
  });
});
