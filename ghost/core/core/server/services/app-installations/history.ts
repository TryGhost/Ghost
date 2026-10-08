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

/** An approval, with the manifest it replaced and the one it approved, where still known. */
interface Approval {
  action: HistoryAction;
  from?: HistoryManifest;
  to?: HistoryManifest;
}

type Entry = AppInstallationHistoryEntry;

/**
 * What happened to an installation, newest first: decisions by people from staff history,
 * and what Ghost did by itself, updating an app or holding changes for approval, from the
 * manifests the installation has run or been asked to approve. Both inputs are oldest
 * first, so what happened in the same second keeps the order it happened in.
 */
export function buildHistory(
  manifests: HistoryManifest[],
  actions: HistoryAction[],
): AppInstallationHistoryEntry[] {
  const approvals = approvalsIn(actions, manifests);
  return newestFirst([
    ...installOf(manifests, actions),
    ...updatesAndSuspensionsOf(manifests, approvals),
    ...approvals.map(approvalEntry),
    ...uninstallsIn(actions),
  ]);
}

/** The oldest manifest is the one installed, with whoever staff history says installed it. */
function installOf(manifests: HistoryManifest[], actions: HistoryAction[]): Entry[] {
  const [installed] = manifests;
  if (!installed) {
    return [];
  }
  const recorded = actions.find(withEvent('installed'));
  return [
    {
      id: recorded?.id ?? installed.id,
      event: 'installed',
      actor: recorded?.actor ?? null,
      created_at: installed.created_at,
    },
  ];
}

/**
 * Every later manifest is something Ghost did by itself: applied an update, or held
 * changes for approval. One an approval points at is told by the approval instead.
 */
function updatesAndSuspensionsOf(manifests: HistoryManifest[], approvals: Approval[]): Entry[] {
  const approved = new Set(approvals.map(({ to }) => to?.id));
  return manifests
    .slice(1)
    .filter((manifest) => !approved.has(manifest.id))
    .map((manifest) => ({
      id: manifest.id,
      event: manifest.requires_approval ? 'suspended' : 'updated',
      actor: null,
      created_at: manifest.created_at,
    }));
}

/** An approval, and where it moved the app to when the manifest it approved runs elsewhere. */
function approvalEntry({ action, from, to }: Approval): Entry {
  const move =
    from && to
      ? movedBetween(
          { manifestUrl: from.manifest_url, manifest: from.manifest },
          { manifestUrl: to.manifest_url, manifest: to.manifest },
        )
      : null;
  return {
    id: action.id,
    event: 'changes_approved',
    actor: action.actor,
    created_at: action.created_at,
    ...(move ? { moved_to: move.to } : {}),
  };
}

function uninstallsIn(actions: HistoryAction[]): Entry[] {
  return actions.filter(withEvent('uninstalled')).map((action) => ({
    id: action.id,
    event: 'uninstalled',
    actor: action.actor,
    created_at: action.created_at,
  }));
}

/** The approvals in staff history, each with the manifest rows its record names. */
function approvalsIn(actions: HistoryAction[], manifests: HistoryManifest[]): Approval[] {
  const byId = new Map(manifests.map((manifest) => [manifest.id, manifest]));
  return actions.filter(withEvent('changes_approved')).map((action) => {
    const record = contextOf(action);
    return {
      action,
      from: byId.get(manifestIdIn(record, 'from_manifest_id')),
      to: byId.get(manifestIdIn(record, 'to_manifest_id')),
    };
  });
}

/** Oldest first and stable, so entries from the same second keep their order, then flipped. */
function newestFirst(entries: Entry[]): Entry[] {
  return entries.sort((a, b) => a.created_at.getTime() - b.created_at.getTime()).reverse();
}

const withEvent = (event: AppInstallationEvent) => (action: HistoryAction) =>
  action.event === event;

/** The action's record, or nothing when it was not written or cannot be read. */
function contextOf(action: HistoryAction): Record<string, unknown> {
  try {
    const parsed: unknown = action.context ? JSON.parse(action.context) : null;
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function manifestIdIn(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}
