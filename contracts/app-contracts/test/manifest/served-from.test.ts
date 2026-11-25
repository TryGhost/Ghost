import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import { appPageUrl, movedBetween, servedFrom } from '../../src/manifest/index.ts';
import type { AppManifest } from '../../src/manifest/index.ts';

const at = (manifestUrl: string, pageUrl: string) =>
  ({
    manifest_url: manifestUrl,
    surfaces: [{ type: 'admin_page', url: pageUrl }],
  }) as AppManifest;

describe('servedFrom', function () {
  it('names the host the app’s page loads from', function () {
    const manifest = at('https://cdn.example.net/app.json', 'https://podcast.example.com/admin');

    assert.equal(servedFrom(manifest), 'podcast.example.com');
    assert.equal(appPageUrl(manifest), 'https://podcast.example.com/admin');
  });

  it('refuses a manifest without surfaces, which a valid one always has', function () {
    assert.throws(() => servedFrom({ surfaces: [] } as unknown as AppManifest), {
      message: 'The manifest has no surfaces',
    });
  });
});

describe('movedBetween', function () {
  const approved = at('https://podcast.example.com/app.json', 'https://podcast.example.com/admin');

  it('is a move when the page runs on another host', function () {
    assert.deepEqual(
      movedBetween(
        approved,
        at('https://podcast.example.com/app.json', 'https://evil.example/admin'),
      ),
      { from: 'podcast.example.com', to: 'evil.example' },
    );
  });

  it('is a move when the manifest is read from another host', function () {
    assert.deepEqual(
      movedBetween(
        approved,
        at('https://cdn.example.net/app.json', 'https://podcast.example.com/admin'),
      ),
      { from: 'podcast.example.com', to: 'cdn.example.net' },
    );
  });

  it('is not a move when only a path changed', function () {
    assert.equal(
      movedBetween(
        approved,
        at('https://podcast.example.com/v2/app.json', 'https://podcast.example.com/v2/admin'),
      ),
      null,
    );
  });
});
