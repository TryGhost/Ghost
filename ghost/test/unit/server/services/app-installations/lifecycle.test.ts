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
  source: NewManifestRow['source'],
  { requiresApproval = false } = {},
): Transition {
  return { to, stores: { source, requiresApproval } };
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
      assert.deepEqual(transition(active, recheck(incoming(silent))), stores('active', 'update'));
      // Including when only some of the changes are silent, or the app moved.
      for (const changed of [
        incoming(needsApproval),
        incoming({ ...silent, ...needsApproval }),
        incoming({}, MOVED_URL),
      ]) {
        assert.deepEqual(
          transition(active, recheck(changed)),
          stores('suspended', 'update', { requiresApproval: true }),
        );
      }
    });

    it('stores any approved manifest but the approved one as the approved manifest', function () {
      assert.deepEqual(transition(active, approve(incoming())), same);
      assert.deepEqual(transition(active, approve(incoming(silent))), stores('active', 'approval'));
      for (const changed of [incoming(needsApproval), incoming({}, MOVED_URL)]) {
        assert.deepEqual(
          transition(active, approve(changed)),
          stores('active', 'approval', { requiresApproval: true }),
        );
      }
    });
  });

  describe('of a suspended installation', function () {
    it('leaves the pending manifest waiting, or replaces it with other changes that need approval', function () {
      assert.deepEqual(transition(suspended, recheck(incoming(needsApproval))), same);
      assert.deepEqual(
        transition(suspended, recheck(incoming({ name: 'Podcasts!' }))),
        stores('suspended', 'update', { requiresApproval: true }),
      );
    });

    it('matches the pending manifest by URL as well as contents', function () {
      const moved = incoming(needsApproval, MOVED_URL);
      assert.deepEqual(
        transition(suspended, recheck(moved)),
        stores('suspended', 'update', { requiresApproval: true }),
      );
      assert.deepEqual(
        transition(suspended, approve(moved)),
        stores('active', 'approval', { requiresApproval: true }),
      );
    });

    it('resumes with a resume row when the app reverts the pending changes', function () {
      // The approved manifest again, with or without silent changes.
      assert.deepEqual(transition(suspended, recheck(incoming())), stores('active', 'resume'));
      assert.deepEqual(
        transition(suspended, recheck(incoming(silent))),
        stores('active', 'resume'),
      );
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
      assert.deepEqual(
        transition(suspended, approve(incoming(silent))),
        stores('active', 'approval'),
      );
      assert.deepEqual(
        transition(suspended, approve(incoming({ name: 'Podcasts!' }))),
        stores('active', 'approval', { requiresApproval: true }),
      );
    });
  });

  it('uninstalls an active or a suspended installation', function () {
    for (const installation of [active, suspended]) {
      assert.deepEqual(transition(installation, { type: 'uninstall' }), { to: 'uninstalled' });
    }
  });
});
