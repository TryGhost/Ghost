import assert from 'node:assert/strict';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import { decideOnManifest } from '../../../../../core/server/services/app-installations/decide-on-manifest';
import type { LoadedManifest } from '../../../../../core/server/services/app-installations/load-manifest';

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';

const approvedManifest: AppManifest = {
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes.',
  author: { name: 'Example Audio', url: 'https://example.com/' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
};

const current = { manifest_url: MANIFEST_URL, manifest: approvedManifest };

/** A loaded manifest, as the loader would hand it over: its digest names its contents. */
function loaded(overrides: Partial<AppManifest> = {}, manifestUrl = MANIFEST_URL): LoadedManifest {
  const manifest = { ...approvedManifest, ...overrides };
  const serialised = JSON.stringify(manifest);
  return { manifestUrl, manifest, serialised, digest: `${manifestUrl}\n${serialised}` };
}

const silent = { description: 'Episodes and players.' };
const needsApproval = { name: 'Podcasts' };

describe('decideOnManifest', function () {
  it('carries the changes it was decided from', function () {
    assert.deepEqual(
      decideOnManifest({ current, pending: null, loaded: loaded({ ...silent, ...needsApproval }) })
        .changes,
      [
        { path: 'description', requires_approval: false },
        { path: 'name', requires_approval: true },
      ],
    );
    assert.deepEqual(decideOnManifest({ current, pending: null, loaded: loaded() }).changes, []);
  });

  describe('with nothing waiting for approval', function () {
    it('leaves the approved manifest alone when it is loaded again', function () {
      assert.equal(
        decideOnManifest({ current, pending: null, loaded: loaded() }).kind,
        'unchanged',
      );
    });

    it('applies silent changes', function () {
      assert.equal(
        decideOnManifest({ current, pending: null, loaded: loaded(silent) }).kind,
        'apply',
      );
    });

    it('suspends on changes that need approval', function () {
      assert.equal(
        decideOnManifest({ current, pending: null, loaded: loaded(needsApproval) }).kind,
        'suspend',
      );
    });

    it('suspends when only some of the changes are silent', function () {
      assert.equal(
        decideOnManifest({
          current,
          pending: null,
          loaded: loaded({ ...silent, ...needsApproval }),
        }).kind,
        'suspend',
      );
    });

    it('suspends when the same manifest is read from another address', function () {
      assert.equal(
        decideOnManifest({
          current,
          pending: null,
          loaded: loaded({}, 'https://podcast.example.com/v2/ghost-app.json'),
        }).kind,
        'suspend',
      );
    });
  });

  describe('with a manifest waiting for approval', function () {
    const pending = { digest: loaded(needsApproval).digest };

    it('uses the waiting manifest when that is the one loaded', function () {
      assert.equal(
        decideOnManifest({ current, pending, loaded: loaded(needsApproval) }).kind,
        'use_pending',
      );
    });

    it('applies the approved manifest again when the app went back on the changes', function () {
      assert.equal(decideOnManifest({ current, pending, loaded: loaded() }).kind, 'apply');
    });

    it('applies a silent change, which lets go of the changes that waited', function () {
      assert.equal(decideOnManifest({ current, pending, loaded: loaded(silent) }).kind, 'apply');
    });

    it('suspends on other changes that need approval, in place of the waiting ones', function () {
      assert.equal(
        decideOnManifest({ current, pending, loaded: loaded({ name: 'Podcasts!' }) }).kind,
        'suspend',
      );
    });

    it('tells the waiting manifest apart by its address too', function () {
      assert.equal(
        decideOnManifest({
          current,
          pending,
          loaded: loaded(needsApproval, 'https://podcast.example.com/v2/ghost-app.json'),
        }).kind,
        'suspend',
      );
    });
  });
});
