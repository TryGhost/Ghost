// PROTOTYPE ONLY (NY-1750): a fake backend for "Label added to a member" automations, kept in
// this browser. Don't merge this folder.
//
// The API can't save a label trigger yet, so the editor saves its stand-in free signup rule for
// real and this file remembers which label each automation uses. Adding or removing that label
// on the member page records who is "in" the automation here; no member really enters it and no
// email is sent. Other browsers, including other people on the preview, don't see any of it.
import { useMemo, useSyncExternalStore } from 'react';
import { useBrowseAutomations } from '@tryghost/admin-x-framework/api/automations';

const STORE_KEY = 'prototype.ny1750.leadMagnets';

type Store = {
  // Automation id → the trigger's label slug.
  labels: Record<string, string>;
  // Automation id → members in it now.
  inProgress: Record<string, string[]>;
  // Automation id → every member who has entered it, since members can't enter twice.
  entered: Record<string, string[]>;
  // Label slug → name, for labels deleted while an automation used them, so its trigger can say
  // "Spring ebook (deleted)".
  deletedLabels: Record<string, string>;
  // Automation id → its name and status at its last save in the editor, so the label picker can
  // check a delete without asking the API (it has no data provider in some places).
  automations: Record<string, { name: string; active: boolean }>;
};

const EMPTY: Store = {
  labels: {},
  inProgress: {},
  entered: {},
  deletedLabels: {},
  automations: {},
};

const load = (): Store => {
  try {
    const stored = localStorage.getItem(STORE_KEY);
    return stored ? { ...EMPTY, ...(JSON.parse(stored) as Partial<Store>) } : EMPTY;
  } catch {
    return EMPTY;
  }
};

let store = load();
const listeners = new Set<() => void>();

const write = (next: Store) => {
  store = next;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: it still works until the next reload.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

const useStore = () => useSyncExternalStore(subscribe, () => store);

const without = (list: string[] | undefined, id: string) => (list ?? []).filter((x) => x !== id);
const withId = (list: string[] | undefined, id: string) =>
  list?.includes(id) ? list : [...(list ?? []), id];

// --- Editor ---

export const getLeadMagnetLabel = (automationId: string | null): string | undefined =>
  automationId ? store.labels[automationId] : undefined;

export const setLeadMagnetLabel = (
  automationId: string,
  labelSlug: string,
  automation: { name: string; active: boolean },
) =>
  write({
    ...store,
    labels: { ...store.labels, [automationId]: labelSlug },
    automations: { ...store.automations, [automationId]: automation },
  });

export const useLeadMagnetInProgressCount = (automationId: string | null | undefined): number => {
  const current = useStore();
  return automationId ? (current.inProgress[automationId]?.length ?? 0) : 0;
};

// Turning an automation off removes everyone in it. They stay "entered", so they can't come back.
export const endLeadMagnetRuns = (automationId: string) =>
  write({ ...store, inProgress: { ...store.inProgress, [automationId]: [] } });

export const getLeadMagnetDeletedLabelName = (labelSlug: string): string | undefined =>
  store.deletedLabels[labelSlug];

// --- Label picker ---

// The active automation a label triggers, if any: its label can't be deleted until it's turned off.
// Read from the editor's last save, so archiving from the automations list isn't seen.
export const useLeadMagnetDeleteBlocker = (
  labelSlug: string | undefined,
): { id: string; name: string } | undefined => {
  const current = useStore();
  if (!labelSlug) {
    return undefined;
  }
  const id = Object.keys(current.labels).find(
    (automationId) =>
      current.labels[automationId] === labelSlug && current.automations[automationId]?.active,
  );
  return id ? { id, name: current.automations[id].name } : undefined;
};

// The active automations these labels start, from the editor's last saves. Adding a label to
// many members at once says so, in the bulk add dialog and import.
export const useLeadMagnetLabelAutomations = (
  labelSlugs: readonly string[],
): { id: string; name: string; labelSlug: string }[] => {
  const current = useStore();
  return Object.entries(current.labels).flatMap(([id, labelSlug]) => {
    const automation = current.automations[id];
    return automation?.active && labelSlugs.includes(labelSlug)
      ? [{ id, name: automation.name, labelSlug }]
      : [];
  });
};

// From this many members, the bulk note adds that it may take longer for everyone to start.
export const BULK_NOTE_THRESHOLD = 1000;

// A deleted label an automation still uses is remembered by name.
export const recordLeadMagnetLabelDeleted = (labelSlug: string, labelName: string) => {
  if (Object.values(store.labels).includes(labelSlug)) {
    write({ ...store, deletedLabels: { ...store.deletedLabels, [labelSlug]: labelName } });
  }
};

// Renaming a label changes its slug, so automations follow it.
export const recordLeadMagnetLabelRenamed = (oldSlug: string, newSlug: string) => {
  if (Object.values(store.labels).includes(oldSlug)) {
    write({
      ...store,
      labels: Object.fromEntries(
        Object.entries(store.labels).map(([id, slug]) => [id, slug === oldSlug ? newSlug : slug]),
      ),
    });
  }
};

// --- Member page ---

type LabelAutomation = {
  id: string;
  name: string;
  labelSlug: string;
  // Re-entry will be a per-automation setting; until then, nobody can re-enter.
  allowsReentry?: boolean;
};

// What saving a member's labels does to the active label automations.
export type LeadMagnetLabelChanges = {
  starts: LabelAutomation[];
  ends: LabelAutomation[];
  // Records the save, once it succeeds.
  record: (memberId: string) => void;
};

export const useLeadMagnetLabelChanges = (
  memberId: string | undefined,
  savedSlugs: readonly string[],
  draftSlugs: readonly string[],
): LeadMagnetLabelChanges => {
  const current = useStore();
  // Only asked for once this browser has a label automation, so other screens and their tests
  // see no extra request.
  const { data } = useBrowseAutomations({
    defaultErrorHandler: false,
    enabled: Object.keys(current.labels).length > 0,
  });
  return useMemo(() => {
    const active: LabelAutomation[] = (data?.automations ?? []).flatMap((automation) => {
      const labelSlug = current.labels[automation.id];
      return automation.status === 'active' && labelSlug
        ? [{ id: automation.id, name: automation.name, labelSlug }]
        : [];
    });
    const starts = active.filter(
      ({ id, labelSlug }) =>
        draftSlugs.includes(labelSlug) &&
        !savedSlugs.includes(labelSlug) &&
        !(memberId && current.entered[id]?.includes(memberId)),
    );
    const ends = active.filter(
      ({ id, labelSlug }) =>
        savedSlugs.includes(labelSlug) &&
        !draftSlugs.includes(labelSlug) &&
        Boolean(memberId && current.inProgress[id]?.includes(memberId)),
    );
    const record = (savedMemberId: string) => {
      const inProgress = { ...store.inProgress };
      const entered = { ...store.entered };
      for (const { id } of starts) {
        inProgress[id] = withId(inProgress[id], savedMemberId);
        entered[id] = withId(entered[id], savedMemberId);
      }
      for (const { id } of ends) {
        inProgress[id] = without(inProgress[id], savedMemberId);
      }
      if (starts.length > 0 || ends.length > 0) {
        write({ ...store, inProgress, entered });
      }
    };
    return { starts, ends, record };
  }, [current, data, memberId, savedSlugs, draftSlugs]);
};

export const hasLeadMagnetChanges = ({ starts, ends }: LeadMagnetLabelChanges) =>
  starts.length > 0 || ends.length > 0;
