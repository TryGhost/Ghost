// scrapeInstanceConfig / scrapeContentApiKey (src/editor/instance-config.ts) —
// the editor-bootstrap scrapers, previously living in the integration harness.
// The regexes are exercised for real against live Ghost HTML by the parity
// suite (test/integration/parity.test.ts imports them through the harness);
// these unit tests pin the contract on synthetic HTML so the suite runs
// without a live instance.
import * as assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { scrapeContentApiKey, scrapeInstanceConfig } from '../../src/editor/instance-config.ts';

const FULL_HTML = `<!DOCTYPE html><html><head>
<link rel="stylesheet" type="text/css" href="/assets/built/screen.css?v=aabbcc0011" />
<script defer src="https://cdn.example.com/portal/portal.min.js" data-i18n="true" data-ghost="http://localhost:2368/" data-key="deadbeefdeadbeefdeadbeef1234" data-api="http://localhost:2368/ghost/api/content/"></script>
<script defer src="https://cdn.example.com/sodo-search/sodo-search.min.js" data-key="deadbeefdeadbeefdeadbeef1234" data-styles="https://cdn.example.com/sodo-search/main.css" data-sodo-search="http://localhost:2368/" crossorigin="anonymous"></script>
</head><body></body></html>`;

describe('editor/instance-config', function () {
  it('scrapes asset hash, portal, and sodo-search into renderer config shape', function () {
    const scrape = scrapeInstanceConfig(FULL_HTML);

    assert.equal(scrape.assetHash, 'aabbcc0011');
    assert.equal(scrape.portalUrl, 'https://cdn.example.com/portal/portal.min.js');
    assert.deepEqual(scrape.sodoSearch, {
      url: 'https://cdn.example.com/sodo-search/sodo-search.min.js',
      styles: 'https://cdn.example.com/sodo-search/main.css',
    });
    assert.deepEqual(scrape.missing, []);
    assert.deepEqual(scrape.config, {
      assetHash: 'aabbcc0011',
      portal: { url: 'https://cdn.example.com/portal/portal.min.js' },
      sodoSearch: {
        url: 'https://cdn.example.com/sodo-search/sodo-search.min.js',
        styles: 'https://cdn.example.com/sodo-search/main.css',
      },
    });
  });

  it('reports every missing scrape and returns an empty config for bare HTML', function () {
    const scrape = scrapeInstanceConfig('<html><body>no scripts here</body></html>');

    assert.equal(scrape.assetHash, undefined);
    assert.equal(scrape.portalUrl, undefined);
    assert.equal(scrape.sodoSearch, undefined);
    assert.equal(scrape.missing.length, 3);
    assert.deepEqual(scrape.config, {});
  });

  it('scrapes the content API key from any data-key attribute', function () {
    assert.equal(scrapeContentApiKey(FULL_HTML), 'deadbeefdeadbeefdeadbeef1234');
    assert.equal(scrapeContentApiKey('<html></html>'), null);
  });
});
