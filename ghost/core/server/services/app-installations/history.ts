import { movedBetween, type AppManifest } from '@tryghost/app-contracts/manifest';
import { z } from 'zod';
import type { AppInstallationEvent } from './actions';
import type { AppInstallationHistoryEntry, HistoryActor } from './codec';

export interface HistoryManifest {
  id: string;
  manifest_url: string;
  source: 'install' | 'approval' | 'update';
  requires_approval: boolean;
  /** Covers the manifest and its address, so two rows with one digest hold the same manifest. */
  digest: string;
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

const ApprovalContext = z.object({
  from_manifest_id: z.string(),
  to_manifest_id: z.string(),
});

interface Approval {
  action: HistoryAction;
  from: string;
  to: string;
}

type Entry = AppInstallationHistoryEntry;

/**
 * `manifestContents` holds the manifests before and after each approval, by id.
 * They're only used to tell whether an approval moved the app.
 */
export function buildHistory(
  manifests: HistoryManifest[],
  actions: HistoryAction[],
  manifestContents: Map<string, AppManifest>,
): AppInstallationHistoryEntry[] {
  const approvals = approvalsIn(actions);
  const urls = new Map(manifests.map((manifest) => [manifest.id, manifest.manifest_url]));
  return newestFirst([
    ...installOf(manifests, actions),
    ...updatesAndSuspensionsOf(manifests, new Set(approvals.map(({ to }) => to))),
    ...approvals.map((approval) => approvalEntry(approval, urls, manifestContents)),
    ...uninstallsIn(actions),
  ]);
}

/** The ids of the manifests before and after each approval. */
export function approvalManifestIds(actions: HistoryAction[]): string[] {
  return [...new Set(approvalsIn(actions).flatMap(({ from, to }) => [from, to]))];
}

function installOf(manifests: HistoryManifest[], actions: HistoryAction[]): Entry[] {
  const installed = manifests.find(({ source }) => source === 'install');
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
 * A newer version Ghost picked up by itself: applied (`updated`), held for approval
 * (`suspended`), or the approved manifest itself, which means the app went back on the
 * changes that waited (`resumed`).
 *
 * Which manifest was approved at each point follows from the rows, oldest first: every row
 * the app ran, which is all of them but the ones Ghost held for approval and no approval
 * ran (`approved` holds the ones approvals ran).
 */
function updatesAndSuspensionsOf(manifests: HistoryManifest[], approved: Set<string>): Entry[] {
  const entries: Entry[] = [];
  let approvedDigest: string | null = null;
  for (const manifest of oldestFirst(manifests)) {
    if (manifest.source === 'update') {
      entries.push({
        id: manifest.id,
        event: manifest.requires_approval
          ? 'suspended'
          : manifest.digest === approvedDigest
            ? 'resumed'
            : 'updated',
        actor: null,
        created_at: manifest.created_at,
      });
    }
    const held = manifest.source === 'update' && manifest.requires_approval;
    if (!held || approved.has(manifest.id)) {
      approvedDigest = manifest.digest;
    }
  }
  return entries;
}

function approvalEntry(
  { action, from, to }: Approval,
  urls: Map<string, string>,
  contents: Map<string, AppManifest>,
): Entry {
  const before = servedManifest(from, urls, contents);
  const after = servedManifest(to, urls, contents);
  const move = before && after ? movedBetween(before, after) : null;
  return {
    id: action.id,
    event: 'changes_approved',
    actor: action.actor,
    created_at: action.created_at,
    ...(move ? { moved_to: move.to } : {}),
  };
}

function servedManifest(id: string, urls: Map<string, string>, contents: Map<string, AppManifest>) {
  const manifestUrl = urls.get(id);
  const manifest = contents.get(id);
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
    const context = ApprovalContext.parse(JSON.parse(action.context ?? 'null'));
    return {
      action,
      from: context.from_manifest_id,
      to: context.to_manifest_id,
    };
  });
}

/**
 * Timestamps only go down to the second, so ties are broken by id.
 * ObjectIds count up as Ghost creates them, so a higher id is newer.
 */
function byAge(a: { id: string; created_at: Date }, b: { id: string; created_at: Date }) {
  return (
    a.created_at.getTime() - b.created_at.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

function oldestFirst<T extends { id: string; created_at: Date }>(rows: T[]): T[] {
  return [...rows].sort(byAge);
}

function newestFirst(entries: Entry[]): Entry[] {
  return entries.sort((a, b) => byAge(b, a));
}

const withEvent = (event: AppInstallationEvent) => (action: HistoryAction) =>
  action.event === event;
