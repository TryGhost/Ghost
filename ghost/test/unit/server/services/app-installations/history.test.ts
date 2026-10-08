import assert from 'node:assert/strict';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import {
  buildHistory,
  type HistoryAction,
  type HistoryManifest,
} from '../../../../../core/server/services/app-installations/history';

const jamie = { id: 'user-1', name: 'Jamie Larson' };

const manifestRow = (
  id: string,
  createdAt: string,
  { requiresApproval = false, host = 'podcast.example.com' } = {},
): HistoryManifest => ({
  id,
  manifest_url: `https://${host}/ghost-app.json`,
  manifest: { surfaces: [{ type: 'admin_page', url: `https://${host}/admin` }] } as AppManifest,
  requires_approval: requiresApproval,
  created_at: new Date(createdAt),
});

const action = (
  id: string,
  event: string,
  createdAt: string,
  context: Record<string, string> | null = {},
): HistoryAction => ({
  id,
  event,
  actor: jamie,
  context: context && JSON.stringify(context),
  created_at: new Date(createdAt),
});

const summary = (entries: ReturnType<typeof buildHistory>) =>
  entries.map(({ event, actor, moved_to }) => [event, actor?.name ?? null, moved_to ?? null]);

describe('buildHistory', function () {
  it('tells installing from the first manifest, with who installed it', function () {
    const history = buildHistory(
      [manifestRow('m1', '2026-10-01T10:00:00.000Z')],
      [action('a1', 'installed', '2026-10-01T10:00:00.000Z')],
    );

    assert.deepEqual(summary(history), [['installed', 'Jamie Larson', null]]);
    assert.equal(history[0].id, 'a1');
  });

  it('still tells the install when staff history has no record of it', function () {
    const history = buildHistory([manifestRow('m1', '2026-10-01T10:00:00.000Z')], []);

    assert.deepEqual(summary(history), [['installed', null, null]]);
    assert.equal(history[0].id, 'm1');
  });

  it('puts updates, suspensions, approvals and uninstalls in order, newest first', function () {
    const history = buildHistory(
      [
        manifestRow('m1', '2026-10-01T10:00:00.000Z'),
        manifestRow('m2', '2026-10-02T10:00:00.000Z'),
        manifestRow('m3', '2026-10-03T10:00:00.000Z', { requiresApproval: true }),
        manifestRow('m4', '2026-10-04T10:00:00.000Z', { requiresApproval: true }),
      ],
      [
        action('a1', 'installed', '2026-10-01T10:00:00.000Z'),
        action('a2', 'changes_approved', '2026-10-04T10:00:00.000Z', {
          from_manifest_id: 'm2',
          to_manifest_id: 'm4',
        }),
        action('a3', 'uninstalled', '2026-10-05T10:00:00.000Z'),
      ],
    );

    assert.deepEqual(summary(history), [
      ['uninstalled', 'Jamie Larson', null],
      ['changes_approved', 'Jamie Larson', null],
      ['suspended', null, null],
      ['updated', null, null],
      ['installed', 'Jamie Larson', null],
    ]);
  });

  it('says where an approval moved the app to', function () {
    const history = buildHistory(
      [
        manifestRow('m1', '2026-10-01T10:00:00.000Z'),
        manifestRow('m2', '2026-10-02T10:00:00.000Z', { host: 'podcast.example.net' }),
      ],
      [
        action('a2', 'changes_approved', '2026-10-02T10:00:00.000Z', {
          from_manifest_id: 'm1',
          to_manifest_id: 'm2',
        }),
      ],
    );

    assert.deepEqual(summary(history)[0], [
      'changes_approved',
      'Jamie Larson',
      'podcast.example.net',
    ]);
  });

  it('keeps the order of things that happened in the same second', function () {
    const second = '2026-10-01T10:00:00.000Z';
    const history = buildHistory(
      [manifestRow('m1', second)],
      [action('a1', 'installed', second), action('a2', 'uninstalled', second)],
    );

    assert.deepEqual(
      history.map(({ event }) => event),
      ['uninstalled', 'installed'],
    );
  });

  it('copes with an approval whose record is missing or unreadable', function () {
    const history = buildHistory(
      [manifestRow('m1', '2026-10-01T10:00:00.000Z')],
      [action('a2', 'changes_approved', '2026-10-02T10:00:00.000Z', null)],
    );

    assert.deepEqual(summary(history)[0], ['changes_approved', 'Jamie Larson', null]);
  });
});
