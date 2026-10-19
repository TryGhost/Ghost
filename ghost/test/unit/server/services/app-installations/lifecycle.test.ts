import assert from 'node:assert/strict';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import type { CurrentInstallation } from '../../../../../core/server/services/app-installations/codec';
import {
  changesFrom,
  transition,
  type InstallationEvent,
  type NewManifestRow,
  type Transition,
} from '../../../../../core/server/services/app-installations/lifecycle';
import type { LoadedManifest } from '../../../../../core/server/services/app-installations/load-manifest';

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';
const MOVED_URL = 'https://podcast.example.com/v2/ghost-app.json';

const approvedManifest: AppManifest = {
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes.',
  author: { name: 'Example Audio', url: 'https://example.com/' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
};

/** An incoming manifest as the loader returns it, with a digest made from its URL and contents. */
function incoming(
  overrides: Partial<AppManifest> = {},
  manifestUrl = MANIFEST_URL,
): LoadedManifest {
  const manifest = { ...approvedManifest, ...overrides };
  const serialised = JSON.stringify(manifest);
  return { manifestUrl, manifest, serialised, digest: `${manifestUrl}\n${serialised}` };
}

const silent = { description: 'Episodes and players.' };
const needsApproval = { name: 'Podcasts' };

const active: CurrentInstallation = {
  id: 'installation',
  app_id: approvedManifest.id,
  status: 'active',
  manifest_id: 'approved',
  revision: 3,
  manifest_url: MANIFEST_URL,
  manifest: approvedManifest,
};
const suspended: CurrentInstallation = {
  ...active,
  status: 'suspended',
  pending: { id: 'pending', digest: incoming(needsApproval).digest },
};

const recheck = (manifest: LoadedManifest): InstallationEvent => ({ type: 'recheck', manifest });
const approve = (manifest: LoadedManifest): InstallationEvent => ({ type: 'approve', manifest });

const same: Transition = { to: 'same' };

function stores(
  to: 'active' | 'suspended',
  manifest: LoadedManifest,
  source: NewManifestRow['source'],
  { requiresApproval = false } = {},
): Transition {
  return { to, stores: { manifest, source, requiresApproval } };
}

describe('changesFrom', function () {
  it('lists what differs from the approved manifest', function () {
    assert.deepEqual(changesFrom(active, incoming({ ...silent, ...needsApproval })), [
      { path: 'description', requires_approval: false },
      { path: 'name', requires_approval: true },
    ]);
    assert.deepEqual(changesFrom(active, incoming({}, MOVED_URL)), [
      { path: 'manifest_url', requires_approval: true },
    ]);
    assert.deepEqual(changesFrom(active, incoming()), []);
  });
});

describe('transition', function () {
  describe('of an active installation', function () {
    it('adopts silent changes a re-check finds, and suspends for any others', function () {
      assert.deepEqual(transition(active, recheck(incoming())), same);
      const silently = incoming(silent);
      assert.deepEqual(transition(active, recheck(silently)), stores('active', silently, 'update'));
      // Including when only some of the changes are silent, or the app moved.
      for (const changed of [
        incoming(needsApproval),
        incoming({ ...silent, ...needsApproval }),
        incoming({}, MOVED_URL),
      ]) {
        assert.deepEqual(
          transition(active, recheck(changed)),
          stores('suspended', changed, 'update', { requiresApproval: true }),
        );
      }
    });

    it('stores any approved manifest but the approved one as the approved manifest', function () {
      assert.deepEqual(transition(active, approve(incoming())), same);
      const silently = incoming(silent);
      assert.deepEqual(
        transition(active, approve(silently)),
        stores('active', silently, 'approval'),
      );
      for (const changed of [incoming(needsApproval), incoming({}, MOVED_URL)]) {
        assert.deepEqual(
          transition(active, approve(changed)),
          stores('active', changed, 'approval', { requiresApproval: true }),
        );
      }
    });
  });

  describe('of a suspended installation', function () {
    it('leaves the pending manifest waiting, or replaces it with other changes that need approval', function () {
      assert.deepEqual(transition(suspended, recheck(incoming(needsApproval))), same);
      const other = incoming({ name: 'Podcasts!' });
      assert.deepEqual(
        transition(suspended, recheck(other)),
        stores('suspended', other, 'update', { requiresApproval: true }),
      );
    });

    it('matches the pending manifest by URL as well as contents', function () {
      const moved = incoming(needsApproval, MOVED_URL);
      assert.deepEqual(
        transition(suspended, recheck(moved)),
        stores('suspended', moved, 'update', { requiresApproval: true }),
      );
      assert.deepEqual(
        transition(suspended, approve(moved)),
        stores('active', moved, 'approval', { requiresApproval: true }),
      );
    });

    it('resumes with a resume row when the app reverts the pending changes', function () {
      // The approved manifest again, with or without silent changes.
      for (const reverted of [incoming(), incoming(silent)]) {
        assert.deepEqual(
          transition(suspended, recheck(reverted)),
          stores('active', reverted, 'resume'),
        );
      }
    });

    it('resumes on any approval, running the rows it has for the pending and approved manifests', function () {
      assert.deepEqual(transition(suspended, approve(incoming(needsApproval))), {
        to: 'active',
        approvedManifestId: 'pending',
      });
      assert.deepEqual(transition(suspended, approve(incoming())), {
        to: 'active',
        approvedManifestId: 'approved',
      });
      const silently = incoming(silent);
      assert.deepEqual(
        transition(suspended, approve(silently)),
        stores('active', silently, 'approval'),
      );
      const other = incoming({ name: 'Podcasts!' });
      assert.deepEqual(
        transition(suspended, approve(other)),
        stores('active', other, 'approval', { requiresApproval: true }),
      );
    });
  });

  it('uninstalls an active or a suspended installation', function () {
    for (const installation of [active, suspended]) {
      assert.deepEqual(transition(installation, { type: 'uninstall' }), { to: 'uninstalled' });
    }
  });
});
