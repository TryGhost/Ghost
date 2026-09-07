import { useCallback, useSyncExternalStore } from 'react';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { AUTOMATION_DESCRIPTIONS, mockAutomations } from './mock';
import { DEFAULT_TRIGGER_CONFIG, type TriggerConfig } from './trigger-config';

// ---------------------------------------------------------------------------
// The prototype's automation store.
//
// Until now every automation lived in a frozen module-level array and every
// edit lived in a `useState` inside the detail screen — so nothing could be
// created, and leaving the screen threw the work away. This is the one place
// automations are held, and it persists.
//
// WHAT PERSISTS, AND WHY ONLY THIS
// Save in the prototype is explicit: you edit, you press Save, and leaving with
// unsaved work warns you. So the saved version is the only thing with any claim
// to durability — the in-flight draft is *defined* as the thing that hasn't been
// committed yet, and writing it to disk would quietly contradict the model (open
// the proto a week later and be told you have unpublished changes from a session
// you don't remember). Drafts therefore stay in React state on the screen; this
// store only ever sees what Save hands it.
//
// Run data is deliberately NOT here. Runs and metrics are hand-authored fixtures
// keyed by automation id (see mock/runs), and a created automation simply has
// none — which is already a designed state, the one `cancellationSurvey` covers.
// ---------------------------------------------------------------------------

/**
 * One automation as the prototype holds it: the real API shape, plus the
 * trigger config that has no home on `AutomationDetail` yet.
 *
 * `trigger: null` is the just-created state — the automation exists and is
 * named, but nothing has been chosen to start it, so the canvas shows a trigger
 * picker instead of a flow. Every seeded automation has one, so null is only
 * ever reachable on something you made.
 */
export interface ProtoAutomation {
  automation: AutomationDetail;
  /**
   * The line under the name in the automations list. Editable, and therefore
   * real data — it used to be a slug-keyed fixture map because the API type has
   * no field for it, which was fine while nobody could change it and wrong the
   * moment they can.
   *
   * A sibling of `automation` rather than a property on it, for the same reason
   * `trigger` is: `AutomationDetail` comes from admin-x-framework and doesn't
   * carry either yet. Both are asks for the real schema.
   *
   * Empty string, never undefined, so a description that's been cleared and one
   * that was never written are the same thing to every reader.
   */
  description: string;
  trigger: TriggerConfig | null;
}

interface StoreState {
  version: number;
  automations: ProtoAutomation[];
  /**
   * Whether the site has Stripe connected — a property of the SITE, not of any
   * automation, which is why it sits beside the list rather than on a record.
   *
   * Held here so it can be flipped at runtime from the lane switcher. It's the
   * one site-level state the automations screens care about, and the difference
   * it makes is only visible by toggling it: a reviewer on a preview URL can't
   * disconnect Stripe to see what happens.
   */
  stripeConnected: boolean;
}

// Bumping the version discards whatever is in localStorage rather than trying to
// migrate it. This is fixture data behind a Labs flag — a reseed is the correct
// response to a shape change, and a migration path would be ceremony around data
// nobody is going to miss.
const VERSION = 10;
const STORAGE_KEY = 'ghost-automations-proto-store';

const seed = (): StoreState => ({
  version: VERSION,
  stripeConnected: true,
  automations: mockAutomations.map((automation) => ({
    automation,
    // The fixture map is the seed now, not the lookup — once a description can be
    // edited, the record has to own it.
    description: AUTOMATION_DESCRIPTIONS[automation.slug] ?? '',
    trigger: DEFAULT_TRIGGER_CONFIG,
  })),
});

const read = (): StoreState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seed();
    }
    const parsed = JSON.parse(raw) as StoreState;
    // Anything unrecognisable is treated as absent. A prototype that throws on
    // boot because of a stale key is worse than one that starts over.
    if (parsed?.version !== VERSION || !Array.isArray(parsed.automations)) {
      return seed();
    }
    return parsed;
  } catch {
    return seed();
  }
};

const write = (next: StoreState) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private window, quota) — the store still works
    // for this session, it just won't outlive the tab.
  }
};

// The snapshot has to be referentially stable between writes or useSyncExternalStore
// re-renders forever, so it's cached here and only replaced when something changes.
let state: StoreState | null = null;
const listeners = new Set<() => void>();

const snapshot = (): StoreState => {
  state ??= read();
  return state;
};

const commit = (next: StoreState) => {
  state = next;
  write(next);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const update = (fn: (automations: ProtoAutomation[]) => ProtoAutomation[]) => {
  const current = snapshot();
  commit({ ...current, version: VERSION, automations: fn(current.automations) });
};

export const useStripeConnected = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => snapshot().stripeConnected,
    () => snapshot().stripeConnected,
  );

export const setStripeConnected = (stripeConnected: boolean): void =>
  commit({ ...snapshot(), stripeConnected });

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

export const UNNAMED_AUTOMATION = 'New automation';

/**
 * A name nothing else is using: the base, then "base (2)", "(3)".
 *
 * The base is always "New automation". Naming a new one after its trigger was
 * tried — "Member signs up (2)" says more than "New automation (2)" — but the
 * rename landed on the same click as the trigger, so the header's title changed
 * while the canvas was rebuilding itself, two regions moving at once for reasons
 * that didn't look related. The better name wasn't worth the collision, and
 * anything an automation is really called gets typed in Settings.
 *
 * Takes the first free number, so deleting (2) makes (2) available again rather
 * than counting past it. Always taking the highest + 1 produces a list that
 * climbs forever while you make and discard test automations, which is the exact
 * situation this naming exists to serve.
 */
export const nextUntitledName = (base: string, taken: string[]): string => {
  const names = new Set(taken);
  if (!names.has(base)) {
    return base;
  }
  let n = 2;
  while (names.has(`${base} (${n})`)) {
    n += 1;
  }
  return `${base} (${n})`;
};

/** nextUntitledName against the names currently in the store. */
export const suggestUntitledName = (): string =>
  nextUntitledName(
    UNNAMED_AUTOMATION,
    snapshot().automations.map((entry) => entry.automation.name),
  );

/**
 * "Welcome series (copy)", then "(copy 2)", "(copy 3)".
 *
 * Not the "(2)" suffix untitled automations get. That one distinguishes
 * automations nobody has named; this one says where a named automation came
 * from, which is the thing you need to see in a list to tell the copy from the
 * original.
 */
export const nextCopyName = (base: string, taken: string[]): string => {
  const names = new Set(taken);
  const first = `${base} (copy)`;
  if (!names.has(first)) {
    return first;
  }
  let n = 2;
  while (names.has(`${base} (copy ${n})`)) {
    n += 1;
  }
  return `${base} (copy ${n})`;
};

/**
 * What to prefill a duplicate's name with, against the names already taken.
 *
 * Exported so the screen offering the copy can show the name BEFORE making it —
 * the alternative is minting the name inside duplicateAutomation, which works
 * only while nobody is allowed to change it.
 */
export const suggestCopyName = (sourceName: string): string =>
  nextCopyName(
    sourceName,
    snapshot().automations.map((entry) => entry.automation.name),
  );

// Real ids are 24-char ObjectIds. The fixtures use readable ones ('auto_welcome')
// for design clarity and created ones follow suit — they end up in the URL, and
// an opaque id there makes a prototype harder to talk about, not more realistic.
const newId = (): string => `auto_${Math.random().toString(36).slice(2, 10)}`;

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const useProtoAutomations = (): ProtoAutomation[] =>
  useSyncExternalStore(
    subscribe,
    () => snapshot().automations,
    () => snapshot().automations,
  );

export const useProtoAutomation = (id: string | undefined): ProtoAutomation | undefined => {
  const find = useCallback(
    () => (id ? snapshot().automations.find((a) => a.automation.id === id) : undefined),
    [id],
  );
  return useSyncExternalStore(subscribe, find, find);
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * A new automation, NOT written to the store.
 *
 * Creating is a two-step act: this makes the thing you're editing, and
 * insertAutomation is what saves it. Nothing exists until Save, which is the same
 * rule every other edit on this screen follows — and it's what Ghost's own tag
 * creation does (`/tags/new` holds a local draft; the record appears on save).
 *
 * The alternative — writing immediately on "New automation" — contradicts that
 * rule and litters the list: click in, look, back out, and you've left an empty
 * automation behind with no way to know you did. The `(2)`, `(3)` numbering was
 * built to cope with exactly that collision, which is a symptom rather than a
 * feature.
 *
 * The id is minted here rather than at save so the screen can navigate to a real
 * URL the moment it saves, and so nothing has to be re-keyed on the way.
 */
export const blankAutomation = (): ProtoAutomation => {
  const id = newId();
  const now = new Date().toISOString();
  // Named for the trigger the moment one is chosen (see the detail screen); until
  // then it needs something, and "New automation" is what an unfinished one is.
  const name = suggestUntitledName();
  return {
    automation: {
      id,
      name,
      slug: `${slugify(name)}-${id.slice(5)}`,
      // Nothing with no steps should read as running.
      status: 'inactive',
      created_at: now,
      updated_at: now,
      actions: [],
      edges: [],
    },
    description: '',
    // No trigger yet — what makes the canvas open on the trigger list.
    trigger: null,
  };
};

/** Save a new automation for the first time. */
export const insertAutomation = (record: ProtoAutomation): void =>
  update((automations) => [record, ...automations]);

/**
 * Copy an automation, returning the new id.
 *
 * Takes the automation and trigger as arguments rather than reading them back
 * out of the store, because what gets copied is what's ON SCREEN — the draft,
 * including edits that haven't been saved. Duplicating what was last saved would
 * hand back a copy quietly missing the changes you were looking at.
 *
 * The name comes in too, rather than being minted here: it's offered to the
 * publisher first (see suggestCopyName) and they can change it before confirming.
 * A name they typed isn't checked for collisions — two automations may share a
 * name if that's what someone wants, exactly as renaming allows.
 *
 * Action ids are regenerated and the edges remapped onto them. Ids are unique
 * per action in the real API, and two automations sharing them would be a lie
 * the prototype tells for free — runs reference actions by id, so a copy that
 * kept them would eventually be indistinguishable from its original.
 *
 * The copy always starts stopped: duplicating shouldn't put a second automation
 * live against the same members without anyone deciding to.
 */
export const duplicateAutomation = (
  source: AutomationDetail,
  trigger: TriggerConfig | null,
  description: string,
  name: string,
): string => {
  const id = newId();
  const now = new Date().toISOString();
  const actionIds = new Map(source.actions.map((action) => [action.id, `act_${newId().slice(5)}`]));
  update((automations) => {
    const copy: ProtoAutomation = {
      automation: {
        ...source,
        id,
        name,
        slug: `${slugify(name)}-${id.slice(5)}`,
        status: 'inactive',
        created_at: now,
        updated_at: now,
        // Stats go. They belong to sends the ORIGINAL made; a copy that has
        // never run would otherwise open showing open rates it didn't earn.
        actions: source.actions.map((action) =>
          action.type === 'send_email'
            ? { ...action, id: actionIds.get(action.id) ?? action.id, stats: undefined }
            : { ...action, id: actionIds.get(action.id) ?? action.id },
        ),
        edges: source.edges.map((edge) => ({
          source_action_id: actionIds.get(edge.source_action_id) ?? edge.source_action_id,
          target_action_id: actionIds.get(edge.target_action_id) ?? edge.target_action_id,
        })),
      },
      description,
      trigger,
    };
    return [copy, ...automations];
  });
  return id;
};

/** Commit a draft. This is what Save and Publish both come down to. */
export const saveAutomation = (
  id: string,
  automation: AutomationDetail,
  trigger: TriggerConfig | null,
): void => {
  update((automations) =>
    automations.map((entry) =>
      entry.automation.id === id
        ? // Spread the entry so the description survives — Save commits the FLOW,
          // and the name and description are edited on their own path.
          {
            ...entry,
            automation: { ...automation, updated_at: new Date().toISOString() },
            trigger,
          }
        : entry,
    ),
  );
};

/**
 * The automation's name and description.
 *
 * Applied immediately rather than through the draft that Save and Publish
 * commit. What the automation is CALLED isn't part of the flow you publish — a
 * rename that sat unpublished would mean the list and the screen you renamed it
 * on disagreed about its name until you got round to publishing something else.
 */
export const updateAutomationDetails = (id: string, name: string, description: string): void => {
  update((automations) =>
    automations.map((entry) =>
      entry.automation.id === id
        ? {
            ...entry,
            description,
            automation: { ...entry.automation, name, updated_at: new Date().toISOString() },
          }
        : entry,
    ),
  );
};

/**
 * Turning an automation on or off. Its own write rather than part of a save,
 * because starting and stopping take effect the moment you confirm them — they
 * aren't edits waiting on a Save button.
 */
export const setAutomationStatus = (id: string, status: AutomationDetail['status']): void => {
  update((automations) =>
    automations.map((entry) =>
      entry.automation.id === id
        ? { ...entry, automation: { ...entry.automation, status } }
        : entry,
    ),
  );
};

export const deleteAutomation = (id: string): void => {
  update((automations) => automations.filter((entry) => entry.automation.id !== id));
};

/**
 * Back to the seeded fixtures.
 *
 * Not a nicety: without it, one bad demo state (every automation deleted, a
 * half-configured automation you can't finish) is permanent for whoever hits it,
 * and localStorage isn't somewhere a reviewer should be asked to go digging.
 */
export const resetProtoStore = (): void => {
  commit(seed());
};
