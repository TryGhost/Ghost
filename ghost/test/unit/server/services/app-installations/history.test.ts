import assert from 'node:assert/strict';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import {
  buildHistory,
  approvalManifestIds,
  type HistoryAction,
  type HistoryManifest,
} from '../../../../../core/server/services/app-installations/history';

const jamie = { id: 'user-1', name: 'Jamie Larson' };

const manifestRow = (
  id: string,
  createdAt: string,
  {
    source = 'update',
    requiresApproval = false,
    host = 'podcast.example.com',
  }: {
    source?: HistoryManifest['source'];
    requiresApproval?: boolean;
    host?: string;
  } = {},
): HistoryManifest => ({
  id,
  manifest_url: `https://${host}/ghost-app.json`,
  source,
  requires_approval: requiresApproval,
  created_at: new Date(createdAt),
});

const installed = (id: string, createdAt: string) =>
  manifestRow(id, createdAt, { source: 'install' });

const servedFrom = (host: string) =>
  ({ surfaces: [{ type: 'admin_page', url: `https://${host}/admin` }] }) as AppManifest;

const action = (
  id: string,
  event: string,
  createdAt: string,
  context: Record<string, string> = {},
): HistoryAction => ({
  id,
  event,
  actor: jamie,
  context: JSON.stringify(context),
  created_at: new Date(createdAt),
});

const summary = (entries: ReturnType<typeof buildHistory>) =>
  entries.map(({ event, actor, moved_to }) => [event, actor?.name ?? null, moved_to ?? null]);

describe('buildHistory', function () {
  it('tells installing from the install manifest, with who installed it', function () {
    const history = buildHistory(
      [installed('m1', '2026-10-01T10:00:00.000Z')],
      [action('a1', 'installed', '2026-10-01T10:00:00.000Z')],
      new Map(),
    );

    assert.deepEqual(summary(history), [['installed', 'Jamie Larson', null]]);
    assert.equal(history[0].id, 'a1');
  });

  it('still tells the install when staff history has no record of it', function () {
    const history = buildHistory([installed('m1', '2026-10-01T10:00:00.000Z')], [], new Map());

    assert.deepEqual(summary(history), [['installed', null, null]]);
    assert.equal(history[0].id, 'm1');
  });

  it('puts updates, suspensions, approvals and uninstalls in order, newest first', function () {
    const history = buildHistory(
      [
        installed('m1', '2026-10-01T10:00:00.000Z'),
        manifestRow('m2', '2026-10-02T10:00:00.000Z'),
        manifestRow('m3', '2026-10-03T10:00:00.000Z', { requiresApproval: true }),
        manifestRow('m4', '2026-10-04T10:00:00.000Z', {
          source: 'approval',
          requiresApproval: true,
        }),
      ],
      [
        action('a1', 'installed', '2026-10-01T10:00:00.000Z'),
        action('a2', 'changes_approved', '2026-10-04T10:00:00.000Z', {
          from_manifest_id: 'm2',
          to_manifest_id: 'm4',
        }),
        action('a3', 'uninstalled', '2026-10-05T10:00:00.000Z'),
      ],
      new Map(),
    );

    assert.deepEqual(summary(history), [
      ['uninstalled', 'Jamie Larson', null],
      ['changes_approved', 'Jamie Larson', null],
      ['suspended', null, null],
      ['updated', null, null],
      ['installed', 'Jamie Larson', null],
    ]);
  });

  it('keeps the changes Ghost held when the approval approves exactly those', function () {
    const history = buildHistory(
      [
        installed('m1', '2026-10-01T10:00:00.000Z'),
        manifestRow('m2', '2026-10-02T10:00:00.000Z', { requiresApproval: true }),
      ],
      [
        action('a2', 'changes_approved', '2026-10-03T10:00:00.000Z', {
          from_manifest_id: 'm1',
          to_manifest_id: 'm2',
        }),
      ],
      new Map(),
    );

    assert.deepEqual(
      history.map(({ event }) => event),
      ['changes_approved', 'suspended', 'installed'],
    );
  });

  it('keeps an earlier update when an approval goes back to the approved manifest', function () {
    const history = buildHistory(
      [
        installed('m1', '2026-10-01T10:00:00.000Z'),
        manifestRow('m2', '2026-10-02T10:00:00.000Z'),
        manifestRow('m3', '2026-10-03T10:00:00.000Z', { requiresApproval: true }),
      ],
      [
        action('a3', 'changes_approved', '2026-10-04T10:00:00.000Z', {
          from_manifest_id: 'm2',
          to_manifest_id: 'm2',
        }),
      ],
      new Map(),
    );

    assert.deepEqual(
      history.map(({ event }) => event),
      ['changes_approved', 'suspended', 'updated', 'installed'],
    );
  });

  it('never shows a manifest an approval added as waiting, even if the approval went unrecorded', function () {
    const history = buildHistory(
      [
        installed('m1', '2026-10-01T10:00:00.000Z'),
        manifestRow('m2', '2026-10-02T10:00:00.000Z', {
          source: 'approval',
          requiresApproval: true,
        }),
      ],
      [],
      new Map(),
    );

    assert.deepEqual(
      history.map(({ event }) => event),
      ['installed'],
    );
  });

  it('tells Ghost running a suspended app again from its resume row', function () {
    const history = buildHistory(
      [
        installed('m1', '2026-10-01T10:00:00.000Z'),
        manifestRow('m2', '2026-10-02T10:00:00.000Z', { requiresApproval: true }),
        manifestRow('m3', '2026-10-03T10:00:00.000Z', { source: 'resume' }),
        manifestRow('m4', '2026-10-04T10:00:00.000Z'),
      ],
      [],
      new Map(),
    );

    assert.deepEqual(summary(history), [
      ['updated', null, null],
      ['resumed', null, null],
      ['suspended', null, null],
      ['installed', null, null],
    ]);
    assert.deepEqual(
      history.map(({ id }) => id),
      ['m4', 'm3', 'm2', 'm1'],
    );
  });

  it('says where an approval moved the app to', function () {
    const history = buildHistory(
      [
        installed('m1', '2026-10-01T10:00:00.000Z'),
        manifestRow('m2', '2026-10-02T10:00:00.000Z', {
          source: 'approval',
          host: 'podcast.example.net',
        }),
      ],
      [
        action('a2', 'changes_approved', '2026-10-02T10:00:00.000Z', {
          from_manifest_id: 'm1',
          to_manifest_id: 'm2',
        }),
      ],
      new Map([
        ['m1', servedFrom('podcast.example.com')],
        ['m2', servedFrom('podcast.example.net')],
      ]),
    );

    assert.deepEqual(summary(history)[0], [
      'changes_approved',
      'Jamie Larson',
      'podcast.example.net',
    ]);
  });

  it('leaves out where an approval moved the app when a manifest could not be read', function () {
    const history = buildHistory(
      [
        installed('m1', '2026-10-01T10:00:00.000Z'),
        manifestRow('m2', '2026-10-02T10:00:00.000Z', {
          source: 'approval',
          host: 'podcast.example.net',
        }),
      ],
      [
        action('a2', 'changes_approved', '2026-10-02T10:00:00.000Z', {
          from_manifest_id: 'm1',
          to_manifest_id: 'm2',
        }),
      ],
      new Map([['m2', servedFrom('podcast.example.net')]]),
    );

    assert.deepEqual(summary(history)[0], ['changes_approved', 'Jamie Larson', null]);
  });

  it('orders what happened in the same second by when its id was created', function () {
    const second = '2026-10-01T10:00:00.000Z';
    const history = buildHistory(
      [
        installed('6a0000000000000000000001', second),
        manifestRow('6a0000000000000000000004', second),
      ],
      [
        action('6a0000000000000000000002', 'installed', second),
        action('6a0000000000000000000003', 'changes_approved', second, {
          from_manifest_id: '6a0000000000000000000001',
          to_manifest_id: '6a0000000000000000000001',
        }),
      ],
      new Map(),
    );

    assert.deepEqual(
      history.map(({ event }) => event),
      ['updated', 'changes_approved', 'installed'],
    );
  });
});

describe('approvalManifestIds', function () {
  it('lists the manifests before and after each approval, once each', function () {
    const ids = approvalManifestIds([
      action('a1', 'installed', '2026-10-01T10:00:00.000Z'),
      action('a2', 'changes_approved', '2026-10-02T10:00:00.000Z', {
        from_manifest_id: 'm1',
        to_manifest_id: 'm2',
      }),
      action('a3', 'changes_approved', '2026-10-03T10:00:00.000Z', {
        from_manifest_id: 'm2',
        to_manifest_id: 'm2',
      }),
    ]);

    assert.deepEqual(ids, ['m1', 'm2']);
  });
});
