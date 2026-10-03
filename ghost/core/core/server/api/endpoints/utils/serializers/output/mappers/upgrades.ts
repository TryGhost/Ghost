import type { UpgradeJobResult, UpgradeStatus } from '@tryghost/adapter-base-upgrade';

// The adapter uses TypeScript conventions; the HTTP contract uses API key conventions.
const fields = {
  supported: 'supported',
  reason: 'reason',
  availability: 'availability',
  targets: 'targets',
  diagnostics: 'diagnostics',
  backupRequired: 'backup_required',
  currentVersion: 'current_version',
  activeJobId: 'active_job_id',
  pollAfterMs: 'poll_after_ms',
  id: 'id',
  state: 'state',
  targetVersion: 'target_version',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export default function upgrades(resource: UpgradeStatus | UpgradeJobResult) {
  const source: Record<string, unknown> = resource;

  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => Object.hasOwn(source, key))
      .map(([key, apiKey]) => [apiKey, source[key]]),
  );
}
