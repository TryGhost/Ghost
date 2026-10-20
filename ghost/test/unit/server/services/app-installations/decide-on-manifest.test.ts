import assert from 'node:assert/strict';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import {
  approvalWrite,
  decideOnManifest,
  recheckWrite,
  type AppManifestChange,
} from '../../../../../core/server/services/app-installations/decide-on-manifest';
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

/** A loaded manifest as the loader returns it, with a digest made from its URL and contents. */
function loaded(overrides: Partial<AppManifest> = {}, manifestUrl = MANIFEST_URL): LoadedManifest {
  const manifest = { ...approvedManifest, ...overrides };
  const serialised = JSON.stringify(manifest);
  return { manifestUrl, manifest, serialised, digest: `${manifestUrl}\n${serialised}` };
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

    it('suspends when the same manifest comes from another URL', function () {
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

  describe('with a pending manifest', function () {
    const pending = { id: 'pending-manifest', digest: loaded(needsApproval).digest };

    it('uses the pending manifest when it is the one loaded, saying which it is', function () {
      assert.deepEqual(decideOnManifest({ current, pending, loaded: loaded(needsApproval) }), {
        kind: 'use_pending',
        changes: [{ path: 'name', requires_approval: true }],
        pending,
      });
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
          loaded: loaded(needsApproval, 'https://podcast.example.com/v2/ghost-app.json'),
        }).kind,
        'suspend',
      );
    });
  });
});

const silentChange: AppManifestChange = { path: 'description', requires_approval: false };
const changeNeedingApproval: AppManifestChange = { path: 'name', requires_approval: true };

describe('approvalWrite', function () {
  const installation = { manifest_id: 'approved-manifest' };
  const pending = { id: 'pending-manifest' };

  it('writes nothing for the approved manifest with nothing pending', function () {
    assert.deepEqual(approvalWrite({ kind: 'unchanged', changes: [] }, installation), {
      kind: 'nothing',
    });
  });

  it('approves the pending manifest’s row', function () {
    assert.deepEqual(
      approvalWrite(
        { kind: 'use_pending', changes: [changeNeedingApproval], pending },
        installation,
      ),
      { kind: 'approve_existing', manifest: pending },
    );
  });

  // The app reverted the pending changes, and approving lets go of them.
  it('approves the approved manifest’s row again when nothing differs from it', function () {
    assert.deepEqual(approvalWrite({ kind: 'resume', changes: [] }, installation), {
      kind: 'approve_existing',
      manifest: { id: 'approved-manifest' },
    });
  });

  it('adds an approval row for any other manifest, which becomes the approved one', function () {
    for (const [kind, changes, requiresApproval] of [
      ['apply', [silentChange], false],
      ['resume', [silentChange], false],
      ['suspend', [silentChange, changeNeedingApproval], true],
    ] as const) {
      assert.deepEqual(
        approvalWrite({ kind, changes: [...changes] }, installation),
        { kind: 'add', source: 'approval', requiresApproval, becomes: 'approved' },
        kind,
      );
    }
  });
});

describe('recheckWrite', function () {
  it('writes nothing for the approved manifest or the pending one', function () {
    assert.deepEqual(recheckWrite({ kind: 'unchanged', changes: [] }), { kind: 'nothing' });
    assert.deepEqual(
      recheckWrite({
        kind: 'use_pending',
        changes: [changeNeedingApproval],
        pending: { id: 'pending-manifest' },
      }),
      { kind: 'nothing' },
    );
  });

  it('adds a row for silent changes, which becomes the approved manifest', function () {
    assert.deepEqual(recheckWrite({ kind: 'apply', changes: [silentChange] }), {
      kind: 'add',
      source: 'update',
      requiresApproval: false,
      becomes: 'approved',
    });
  });

  it('adds a resume row when the app reverted the pending changes, which lifts the suspension', function () {
    assert.deepEqual(recheckWrite({ kind: 'resume', changes: [] }), {
      kind: 'add',
      source: 'resume',
      requiresApproval: false,
      becomes: 'approved',
    });
  });

  it('adds a row for changes that need approval, which becomes the pending manifest', function () {
    assert.deepEqual(recheckWrite({ kind: 'suspend', changes: [changeNeedingApproval] }), {
      kind: 'add',
      source: 'update',
      requiresApproval: true,
      becomes: 'pending',
    });
  });
});
