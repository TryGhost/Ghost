import assert from 'node:assert/strict';
import { z } from 'zod';
import { CurrentInstallationRow } from '../../../../../core/server/services/app-installations/codec';

const manifest = {
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes.',
  author: { name: 'Example Audio', url: 'https://example.com/' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
};

const row: z.input<typeof CurrentInstallationRow> = {
  id: 'installation',
  app_id: manifest.id,
  status: 'active',
  manifest_id: 'approved',
  pending_manifest_id: null,
  revision: 3,
  manifest_url: 'https://podcast.example.com/ghost-app.json',
  manifest: JSON.stringify(manifest),
  pending_digest: null,
};

describe('CurrentInstallationRow', function () {
  it('decodes an active installation without a pending manifest', function () {
    const installation = z.decode(CurrentInstallationRow, row);

    assert.equal(installation.status, 'active');
    assert.equal('pending' in installation, false);
  });

  it('decodes a suspended installation with its pending manifest', function () {
    const installation = z.decode(CurrentInstallationRow, {
      ...row,
      status: 'suspended',
      pending_manifest_id: 'pending',
      pending_digest: 'pending-digest',
    });

    assert.equal(installation.status, 'suspended');
    assert.deepEqual(installation.status === 'suspended' && installation.pending, {
      id: 'pending',
      digest: 'pending-digest',
    });
  });

  it('refuses a row whose status and pending manifest disagree, saying what is wrong', function () {
    for (const [disagreeing, message] of [
      [
        { ...row, pending_manifest_id: 'pending', pending_digest: 'pending-digest' },
        "An active installation can't have a pending manifest, but has pending.",
      ],
      [{ ...row, status: 'suspended' }, 'A suspended installation needs a pending manifest.'],
      [
        { ...row, status: 'suspended', pending_manifest_id: 'pending' },
        "The suspended installation's pending manifest pending doesn't exist.",
      ],
      [{ ...row, status: 'uninstalled' }, "An uninstalled installation isn't current."],
    ] as const) {
      assert.throws(
        () => z.decode(CurrentInstallationRow, disagreeing),
        (err: unknown) => err instanceof z.ZodError && err.issues[0]?.message === message,
      );
    }
  });
});
