import { movedBetween, type AppManifest } from '@tryghost/app-contracts/manifest';
import type { AppInstallationEvent } from './actions';
import type { AppInstallationHistoryEntry, HistoryActor } from './codec';

export interface HistoryManifest {
  id: string;
  manifest_url: string;
  requires_approval: boolean;
  created_at: Date;
}

export interface HistoryAction {
  id: string;
  event: string;
  actor: HistoryActor;
  /** JSON text, not yet parsed. */
  context: string | null;
  created_at: Date;
}

/**
 * The ids in an approval's context, each undefined when the context doesn't have it.
 * Approvals recorded before `inserted` was kept don't have it either.
 */
interface Approval {
  action: HistoryAction;
  from?: string;
  to?: string;
  inserted?: string;
}

type Entry = AppInstallationHistoryEntry;

/**
 * `manifests` must be oldest first, since the first one is the install. `manifestBodies`
 * holds the contents of the manifests approvals name, by id, which is all the history
 * reads them for: whether an approval moved the app.
 */
export function buildHistory(
  manifests: HistoryManifest[],
  actions: HistoryAction[],
  manifestBodies: Map<string, AppManifest>,
): AppInstallationHistoryEntry[] {
  const approvals = approvalsIn(actions);
  const urls = new Map(manifests.map((manifest) => [manifest.id, manifest.manifest_url]));
  return newestFirst([
    ...installOf(manifests, actions),
    ...updatesAndSuspensionsOf(manifests, approvals),
    ...approvals.map((approval) => approvalEntry(approval, urls, manifestBodies)),
    ...uninstallsIn(actions),
  ]);
}

/** The ids of the manifests approvals name, whose contents `buildHistory` needs. */
export function manifestIdsApprovalsName(actions: HistoryAction[]): string[] {
  const ids = approvalsIn(actions).flatMap(({ from, to }) => [from, to]);
  return [...new Set(ids.filter((id): id is string => id !== undefined))];
}

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
 * Every manifest after the first is a change Ghost picked up by itself: applied straight
 * away (`updated`) or held for an Administrator to approve (`suspended`). The exception is
 * a manifest an approval wrote itself, when the Administrator approved a newer version than
 * the one Ghost held: the approval's own entry covers that one.
 */
function updatesAndSuspensionsOf(manifests: HistoryManifest[], approvals: Approval[]): Entry[] {
  const writtenByApprovals = new Set(approvals.map(({ inserted }) => inserted));
  return manifests
    .slice(1)
    .filter((manifest) => !writtenByApprovals.has(manifest.id))
    .map((manifest) => ({
      id: manifest.id,
      event: manifest.requires_approval ? 'suspended' : 'updated',
      actor: null,
      created_at: manifest.created_at,
    }));
}

function approvalEntry(
  { action, from, to }: Approval,
  urls: Map<string, string>,
  bodies: Map<string, AppManifest>,
): Entry {
  const before = from ? served(from, urls, bodies) : undefined;
  const after = to ? served(to, urls, bodies) : undefined;
  const move = before && after ? movedBetween(before, after) : null;
  return {
    id: action.id,
    event: 'changes_approved',
    actor: action.actor,
    created_at: action.created_at,
    ...(move ? { moved_to: move.to } : {}),
  };
}

function served(id: string, urls: Map<string, string>, bodies: Map<string, AppManifest>) {
  const manifestUrl = urls.get(id);
  const manifest = bodies.get(id);
  return manifestUrl && manifest ? { manifestUrl, manifest } : undefined;
}

function uninstallsIn(actions: HistoryAction[]): Entry[] {
  return actions.filter(withEvent('uninstalled')).map((action) => ({
    id: action.id,
    event: 'uninstalled',
    actor: action.actor,
    created_at: action.created_at,
  }));
}

function approvalsIn(actions: HistoryAction[]): Approval[] {
  return actions.filter(withEvent('changes_approved')).map((action) => {
    const context = contextOf(action);
    return {
      action,
      from: idIn(context, 'from_manifest_id'),
      to: idIn(context, 'to_manifest_id'),
      inserted: idIn(context, 'inserted_manifest_id'),
    };
  });
}

/**
 * Timestamps are only precise to the second, so entries from the same second are ordered
 * by id. Ghost's ObjectIds start with the time and end with a counter that goes up with
 * every id a Ghost process creates, so a later id was created later.
 */
function newestFirst(entries: Entry[]): Entry[] {
  return entries.sort(
    (a, b) =>
      b.created_at.getTime() - a.created_at.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
  );
}

const withEvent = (event: AppInstallationEvent) => (action: HistoryAction) =>
  action.event === event;

function contextOf(action: HistoryAction): Record<string, unknown> {
  try {
    const parsed: unknown = action.context ? JSON.parse(action.context) : null;
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function idIn(context: Record<string, unknown>, key: string): string | undefined {
  const value = context[key];
  return typeof value === 'string' ? value : undefined;
}
