import { movedBetween, type AppManifest } from '@tryghost/app-contracts/manifest';
import { z } from 'zod';
import type { AppInstallationEvent } from './actions';
import type { AppInstallationHistoryEntry, HistoryActor } from './codec';

export interface HistoryManifest {
  id: string;
  manifest_url: string;
  source: 'install' | 'approval' | 'update';
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
 * `manifestBodies` maps ids to manifest contents.
 * It only needs the manifests that approvals point to.
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
    ...updatesAndSuspensionsOf(manifests),
    ...approvals.map((approval) => approvalEntry(approval, urls, manifestBodies)),
    ...uninstallsIn(actions),
  ]);
}

/** The ids of the manifests that approvals point to. */
export function manifestIdsApprovalsName(actions: HistoryAction[]): string[] {
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
 * A newer version Ghost picked up by itself.
 * Ghost either applied it (`updated`) or held it for approval (`suspended`).
 */
function updatesAndSuspensionsOf(manifests: HistoryManifest[]): Entry[] {
  return manifests
    .filter(({ source }) => source === 'update')
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
  const before = served(from, urls, bodies);
  const after = served(to, urls, bodies);
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
function newestFirst(entries: Entry[]): Entry[] {
  return entries.sort(
    (a, b) =>
      b.created_at.getTime() - a.created_at.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
  );
}

const withEvent = (event: AppInstallationEvent) => (action: HistoryAction) =>
  action.event === event;
