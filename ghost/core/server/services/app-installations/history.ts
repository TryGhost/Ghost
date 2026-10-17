import { movedBetween, type AppManifest } from '@tryghost/app-contracts/manifest';
import { z } from 'zod';
import type { AppInstallationEvent } from './actions';
import type { AppInstallationHistoryEntry, HistoryActor } from './codec';
import type { AppInstallationManifestSource } from './schema';

export interface HistoryManifest {
  id: string;
  manifest_url: string;
  source: z.infer<typeof AppInstallationManifestSource>;
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
    ...updatesSuspensionsAndResumesOf(manifests),
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
 * Entries for changes the re-check made, one per manifest row: adopted a newer manifest
 * (`updated`), suspended the app for approval (`suspended`), or lifted a suspension
 * (`resumed`).
 */
function updatesSuspensionsAndResumesOf(manifests: HistoryManifest[]): Entry[] {
  return manifests
    .filter(({ source }) => source === 'update' || source === 'resume')
    .map((manifest) => ({
      id: manifest.id,
      event:
        manifest.source === 'resume'
          ? 'resumed'
          : manifest.requires_approval
            ? 'suspended'
            : 'updated',
      actor: null,
      created_at: manifest.created_at,
    }));
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
 * ObjectIds increase over time, so a higher id is newer.
 */
function newestFirst(entries: Entry[]): Entry[] {
  return entries.sort(
    (a, b) =>
      b.created_at.getTime() - a.created_at.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
  );
}

const withEvent = (event: AppInstallationEvent) => (action: HistoryAction) =>
  action.event === event;
