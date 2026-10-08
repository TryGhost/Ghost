import { movedBetween, type AppManifest } from '@tryghost/app-contracts/manifest';
import type { AppInstallationEvent } from './actions';
import type { AppInstallationHistoryEntry, HistoryActor } from './codec';

/** A manifest row, oldest first, as the history reads it. */
export interface HistoryManifest {
  id: string;
  manifest_url: string;
  manifest: AppManifest;
  requires_approval: boolean;
  created_at: Date;
}

/** A staff history row for the installation, oldest first, with who acted. */
export interface HistoryAction {
  id: string;
  event: string;
  actor: HistoryActor;
  /** The `context` column, still as the JSON it was written as. */
  context: string | null;
  created_at: Date;
}

function contextOf(action: HistoryAction): Record<string, unknown> {
  try {
    const parsed: unknown = action.context ? JSON.parse(action.context) : null;
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function manifestIdIn(context: Record<string, unknown>, key: string): string | undefined {
  const value = context[key];
  return typeof value === 'string' ? value : undefined;
}

const isEvent = (event: AppInstallationEvent) => (action: HistoryAction) => action.event === event;

/**
 * What happened to an installation, newest first: decisions by people from staff history,
 * and what Ghost did by itself, updating an app or holding changes for approval, from the
 * manifests the installation has run or been asked to approve.
 *
 * The oldest manifest is the one installed, with whoever staff history says installed it.
 * A manifest an approval points at is told by the approval, which also says where the app
 * moved to when the approval moved it. Both inputs are oldest first, so what happened in
 * the same second keeps the order it happened in.
 */
export function buildHistory(
  manifests: HistoryManifest[],
  actions: HistoryAction[],
): AppInstallationHistoryEntry[] {
  const manifestsById = new Map(manifests.map((manifest) => [manifest.id, manifest]));
  const approvals = actions.filter(isEvent('changes_approved')).map((action) => {
    const context = contextOf(action);
    return {
      action,
      from: manifestsById.get(manifestIdIn(context, 'from_manifest_id') ?? ''),
      to: manifestsById.get(manifestIdIn(context, 'to_manifest_id') ?? ''),
    };
  });
  const approvedIds = new Set(approvals.map(({ to }) => to?.id));
  const installer = actions.find(isEvent('installed'));

  const entries: AppInstallationHistoryEntry[] = [];
  const [installed, ...later] = manifests;
  if (installed) {
    entries.push({
      id: installer?.id ?? installed.id,
      event: 'installed',
      actor: installer?.actor ?? null,
      created_at: installed.created_at,
    });
  }
  for (const manifest of later) {
    if (!approvedIds.has(manifest.id)) {
      entries.push({
        id: manifest.id,
        event: manifest.requires_approval ? 'suspended' : 'updated',
        actor: null,
        created_at: manifest.created_at,
      });
    }
  }
  for (const { action, from, to } of approvals) {
    const move =
      from && to
        ? movedBetween(
            { manifestUrl: from.manifest_url, manifest: from.manifest },
            { manifestUrl: to.manifest_url, manifest: to.manifest },
          )
        : null;
    entries.push({
      id: action.id,
      event: 'changes_approved',
      actor: action.actor,
      created_at: action.created_at,
      ...(move ? { moved_to: move.to } : {}),
    });
  }
  for (const action of actions.filter(isEvent('uninstalled'))) {
    entries.push({
      id: action.id,
      event: 'uninstalled',
      actor: action.actor,
      created_at: action.created_at,
    });
  }

  return entries.sort((a, b) => a.created_at.getTime() - b.created_at.getTime()).reverse();
}
