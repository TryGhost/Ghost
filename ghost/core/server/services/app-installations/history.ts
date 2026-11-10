import { movedBetween, type AppManifest } from '@tryghost/app-contracts/manifest';
import { z } from 'zod';
import { DbJson } from '../../lib/db-types/json';
import type { ActionName } from '../action-log/kinds';
import type { AppInstallationHistoryEntry, HistoryActor } from './codec';
import type { AppInstallationManifestSource } from './schema';

export interface HistoryManifest {
  id: string;
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

// Context that isn't JSON, or doesn't say these, reads as an action without them rather than
// failing the history.
const ActionContext = DbJson(z.json());
const NamedContext = z.object({ action_name: z.string() });
const ApprovalContext = z.object({
  from_manifest_id: z.string(),
  to_manifest_id: z.string(),
});

/** An action with its context read, once. */
interface ReadAction {
  action: HistoryAction;
  /**
   * What happened, as the action log names it. Actions logged before those names existed carry
   * the name as their verb.
   */
  name: string;
  /** The manifests an approval moved between, when the context says. */
  approval: { from: string; to: string } | null;
}

function read(action: HistoryAction): ReadAction {
  const context = ActionContext.safeParse(action.context ?? '').data;
  const approval = ApprovalContext.safeParse(context).data;
  return {
    action,
    name: NamedContext.safeParse(context).data?.action_name ?? action.event,
    approval: approval ? { from: approval.from_manifest_id, to: approval.to_manifest_id } : null,
  };
}

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
  const readActions = actions.map(read);
  return newestFirst([
    ...installOf(manifests, readActions),
    ...updatesSuspensionsAndResumesOf(manifests),
    ...approvalsIn(readActions).map((approval) => approvalEntry(approval, manifestContents)),
    ...uninstallsIn(readActions),
  ]);
}

/** The ids of the manifests before and after each approval. */
export function approvalManifestIds(actions: HistoryAction[]): string[] {
  return [...new Set(approvalsIn(actions.map(read)).flatMap(({ from, to }) => [from, to]))];
}

function installOf(manifests: HistoryManifest[], actions: ReadAction[]): Entry[] {
  const installed = manifests.find(({ source }) => source === 'install');
  if (!installed) {
    return [];
  }
  const recorded = actions.find(named('installed'))?.action;
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
 * Entries for changes the re-check made, one per manifest row: applied a newer manifest
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

function approvalEntry({ action, from, to }: Approval, contents: Map<string, AppManifest>): Entry {
  const before = contents.get(from);
  const after = contents.get(to);
  const move = before && after ? movedBetween(before, after) : null;
  return {
    id: action.id,
    event: 'changes_approved',
    actor: action.actor,
    created_at: action.created_at,
    ...(move ? { moved_to: move.to } : {}),
  };
}

function uninstallsIn(actions: ReadAction[]): Entry[] {
  return actions.filter(named('uninstalled')).map(({ action }) => ({
    id: action.id,
    event: 'uninstalled',
    actor: action.actor,
    created_at: action.created_at,
  }));
}

/** Approvals whose context says which manifests they moved between. */
function approvalsIn(actions: ReadAction[]): Approval[] {
  return actions
    .filter(named('changes_approved'))
    .flatMap(({ action, approval }) => (approval ? [{ action, ...approval }] : []));
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

/** Matches the actions the action log gives this name, which an installation's history uses. */
const named = (name: ActionName<'app_installation'>) => (action: ReadAction) =>
  action.name === name;
