import assert from 'node:assert/strict';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import { decideOnManifest } from '../../../../../core/server/services/app-installations/decide-on-manifest';
import type { LoadedManifest } from '../../../../../core/server/services/app-installations/load-manifest';
import { FIXTURE_BACKEND_KEY, FIXTURE_IDENTITY_KEY } from '../../../../utils/app-identity';

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';

const approvedManifest: AppManifest = {
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes.',
  author: { name: 'Example Audio', url: 'https://example.com/' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
  manifest_url: MANIFEST_URL,
  identity_key: FIXTURE_IDENTITY_KEY,
  backend_key: FIXTURE_BACKEND_KEY,
  development: false,
};

const current = { manifest: approvedManifest };

/** A loaded manifest as the loader returns it, with a digest made from its contents. */
function loaded(overrides: Partial<AppManifest> = {}): LoadedManifest {
  const manifest = { ...approvedManifest, ...overrides };
  const serialised = JSON.stringify(manifest);
  return {
    manifestUrl: manifest.manifest_url,
    manifest,
    serialised,
    digest: serialised,
    identityKeyThumbprint: 'identity',
    backendKeyThumbprint: 'backend',
  };
}

const silent = { description: 'Episodes and players.' };
const needsApproval = { name: 'Podcasts' };

describe('decideOnManifest', function () {
  it('returns the changes the decision was based on', function () {
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

  describe('with nothing pending', function () {
    it('does nothing when the approved manifest is loaded again', function () {
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

    it('suspends when the manifest moves to another URL', function () {
      assert.equal(
        decideOnManifest({
          current,
          pending: null,
          loaded: loaded({ manifest_url: 'https://podcast.example.com/v2/ghost-app.json' }),
        }).kind,
        'suspend',
      );
    });

    it('applies a new backend key silently', function () {
      assert.equal(
        decideOnManifest({
          current,
          pending: null,
          loaded: loaded({ backend_key: { ...FIXTURE_BACKEND_KEY, x: FIXTURE_IDENTITY_KEY.x } }),
        }).kind,
        'apply',
      );
    });
  });

  describe('with a pending manifest', function () {
    const pending = { digest: loaded(needsApproval).digest };

    it('uses the pending manifest when it is the one loaded', function () {
      assert.equal(
        decideOnManifest({ current, pending, loaded: loaded(needsApproval) }).kind,
        'use_pending',
      );
    });

    it('applies the approved manifest again when the app reverts the pending changes', function () {
      assert.equal(decideOnManifest({ current, pending, loaded: loaded() }).kind, 'resume');
    });

    it('applies a silent change and clears the pending changes', function () {
      assert.equal(decideOnManifest({ current, pending, loaded: loaded(silent) }).kind, 'resume');
    });

    it('suspends on different changes that need approval, replacing the pending ones', function () {
      assert.equal(
        decideOnManifest({ current, pending, loaded: loaded({ name: 'Podcasts!' }) }).kind,
        'suspend',
      );
    });

    it('matches the pending manifest by URL as well as contents', function () {
      assert.equal(
        decideOnManifest({
          current,
          pending,
          loaded: loaded({
            ...needsApproval,
            manifest_url: 'https://podcast.example.com/v2/ghost-app.json',
          }),
        }).kind,
        'suspend',
      );
    });
  });
});
