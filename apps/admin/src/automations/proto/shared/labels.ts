import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// The site's labels.
//
// Its own store rather than fields on the automations store, for the reason the
// real API draws the same line: labels are a site-level resource with their own
// endpoint, not a property of any automation. An automation's trigger holds
// label IDS; what those ids NAME belongs to the site.
//
// It has to be a store at all — rather than the frozen fixture array it started
// as — because the picker can create labels, the way the members area's can. A
// label typed into the trigger field is a label the site now has, and it has to
// still be there when you come back to the screen.
//
// Deliberately standalone, importing nothing: shared/store imports trigger-config,
// and trigger-config needs to name labels, so a label list living in either of
// them would close a cycle. Depending on nothing, this can be read from both.
// ---------------------------------------------------------------------------

export interface ProtoLabel {
  id: string;
  name: string;
}

// Written as a real site's labels rather than as demo data: a publisher's labels
// name where someone came from, because that's what a label attached to a signup
// form can know. The first is the lead magnet the seeded automation delivers.
const SEED: ProtoLabel[] = [
  { id: 'seo-guide', name: 'SEO guide' },
  { id: 'webinar', name: 'Webinar signup' },
  { id: 'instagram', name: 'From Instagram' },
];

const VERSION = 1;
const STORAGE_KEY = 'ghost-automations-proto-labels';

interface LabelState {
  version: number;
  labels: ProtoLabel[];
}

const read = (): LabelState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version: VERSION, labels: SEED };
    }
    const parsed = JSON.parse(raw) as LabelState;
    if (parsed?.version !== VERSION || !Array.isArray(parsed.labels)) {
      return { version: VERSION, labels: SEED };
    }
    return parsed;
  } catch {
    return { version: VERSION, labels: SEED };
  }
};

const write = (next: LabelState) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — the list still works for this session
  }
};

// Same referential-stability contract as the automations store: useSyncExternalStore
// re-renders forever if the snapshot isn't stable between writes.
let state: LabelState | null = null;
const listeners = new Set<() => void>();

const snapshot = (): LabelState => {
  state ??= read();
  return state;
};

const commit = (next: LabelState) => {
  state = next;
  write(next);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The site's labels, for components. */
export const useLabels = (): ProtoLabel[] =>
  useSyncExternalStore(
    subscribe,
    () => snapshot().labels,
    () => snapshot().labels,
  );

/**
 * The same list, for the pure functions that name a trigger's audience
 * (audienceLabel and everything downstream of it). Those are called inline
 * during render by callers that have no business subscribing to this, and the
 * component that CAN change the list — the picker — re-renders them anyway.
 */
export const getLabels = (): ProtoLabel[] => snapshot().labels;

/**
 * An id from a name, the way a slug is derived everywhere else in Ghost.
 *
 * Collisions get a numeric suffix rather than being rejected: the picker already
 * refuses to create a label whose NAME is taken (see canCreateLabel), so the
 * only way here is two different names that slugify the same ("Q1 promo" and
 * "Q1 — promo"), and silently handing back the existing label's id would attach
 * the trigger to the wrong one.
 */
const nextLabelId = (name: string, existing: ProtoLabel[]): string => {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'label';
  if (!existing.some((label) => label.id === base)) {
    return base;
  }
  let suffix = 2;
  while (existing.some((label) => label.id === `${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
};

/**
 * Create a label and hand it back, so the caller can select it in the same
 * gesture — typing a name and pressing Create means "watch this one", not
 * "add it to the list and make me find it".
 *
 * Returns the EXISTING label if the name is already taken. The picker doesn't
 * offer Create in that case, so this is a guard rather than a path: it means a
 * duplicate can't be made by any route, including a race between two presses.
 */
export const createLabel = (name: string): ProtoLabel => {
  const trimmed = name.trim();
  const current = snapshot().labels;
  const existing = current.find((label) => label.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    return existing;
  }
  const created: ProtoLabel = { id: nextLabelId(trimmed, current), name: trimmed };
  commit({ version: VERSION, labels: [...current, created] });
  return created;
};

/** Whether a typed name is a new label — the members picker's own rule. */
export const canCreateLabel = (labels: ProtoLabel[], query: string): boolean => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return !labels.some((label) => label.name.toLowerCase() === normalized);
};

/**
 * A label's name, or null if the id names nothing.
 *
 * Null rather than a fallback string, so callers decide what an unresolvable id
 * should read as — the trigger's audience says "Labelled members", a field says
 * "Choose a label", and neither should be baked in here.
 */
export const labelName = (labelId: string | null): string | null =>
  labelId === null ? null : (getLabels().find((label) => label.id === labelId)?.name ?? null);

/** Part of the lane switcher's reset — the labels are prototype data too. */
export const resetLabels = (): void => commit({ version: VERSION, labels: SEED });
