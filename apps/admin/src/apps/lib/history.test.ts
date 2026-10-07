import { describe, expect, it } from 'vitest';
import type { Action } from '@tryghost/admin-x-framework/api/actions';
import type {
  AppInstallationManifest,
  AppManifest,
} from '@tryghost/admin-x-framework/api/app-installations';
import { appHistory } from './history';

const manifestRow = (
  id: string,
  createdAt: string,
  { requiresApproval = false, host = 'podcast.example.com' } = {},
): AppInstallationManifest => ({
  id,
  manifest_url: `https://${host}/ghost-app.json`,
  manifest: { surfaces: [{ type: 'admin_page', url: `https://${host}/admin` }] } as AppManifest,
  requires_approval: requiresApproval,
  created_at: createdAt,
});

const action = (
  id: string,
  event: string,
  createdAt: string,
  context: Record<string, string> = {},
): Action => ({
  id,
  event,
  created_at: createdAt,
  context,
  resource_id: 'installation-1',
  resource_type: 'app_installation',
  actor_id: 'user-1',
  actor_type: 'user',
  actor: { id: 'user-1', name: 'Jamie Larson', slug: 'jamie', image: null },
});

const summary = (entries: ReturnType<typeof appHistory>) =>
  entries.map(({ title, by }) => (by ? `${title} by ${by}` : title));

describe('appHistory', () => {
  it('tells installing from the first manifest, with who installed it', () => {
    const history = appHistory(
      [action('a1', 'installed', '2026-10-01T10:00:00.000Z')],
      [manifestRow('m1', '2026-10-01T10:00:00.000Z')],
    );

    expect(summary(history)).toEqual(['Installed by Jamie Larson']);
  });

  it('still shows the install when staff history has no record of it', () => {
    expect(summary(appHistory([], [manifestRow('m1', '2026-10-01T10:00:00.000Z')]))).toEqual([
      'Installed',
    ]);
  });

  it('puts updates, suspensions, approvals and uninstalls in order, newest first', () => {
    const history = appHistory(
      [
        action('a3', 'uninstalled', '2026-10-05T10:00:00.000Z'),
        action('a2', 'changes_approved', '2026-10-04T10:00:00.000Z', {
          from_manifest_id: 'm2',
          to_manifest_id: 'm4',
        }),
        action('a1', 'installed', '2026-10-01T10:00:00.000Z'),
      ],
      [
        manifestRow('m4', '2026-10-04T10:00:00.000Z', { requiresApproval: true }),
        manifestRow('m3', '2026-10-03T10:00:00.000Z', { requiresApproval: true }),
        manifestRow('m2', '2026-10-02T10:00:00.000Z'),
        manifestRow('m1', '2026-10-01T10:00:00.000Z'),
      ],
    );

    expect(summary(history)).toEqual([
      'Uninstalled by Jamie Larson',
      'Changes approved by Jamie Larson',
      'Updated, needs approval',
      'Updated',
      'Installed by Jamie Larson',
    ]);
  });

  it('says where an app moved to when an approval moved it', () => {
    const history = appHistory(
      [
        action('a2', 'changes_approved', '2026-10-02T10:00:00.000Z', {
          from_manifest_id: 'm1',
          to_manifest_id: 'm2',
        }),
      ],
      [
        manifestRow('m2', '2026-10-02T10:00:00.000Z', { host: 'podcast.example.net' }),
        manifestRow('m1', '2026-10-01T10:00:00.000Z'),
      ],
    );

    expect(summary(history)[0]).toBe('Moved to podcast.example.net by Jamie Larson');
  });

  it('keeps the order of things that happened in the same second', () => {
    const second = '2026-10-01T10:00:00.000Z';
    const history = appHistory(
      [action('a2', 'uninstalled', second), action('a1', 'installed', second)],
      [manifestRow('m1', second)],
    );

    expect(summary(history)).toEqual(['Uninstalled by Jamie Larson', 'Installed by Jamie Larson']);
  });
});
