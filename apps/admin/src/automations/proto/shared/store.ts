import { useCallback, useSyncExternalStore } from 'react';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { AUTOMATION_DESCRIPTIONS, mockAutomations } from './mock';
import {
  type TriggerConfig,
  needsStripe,
  tiersUnanswered,
  triggerConfigFor,
} from './trigger-config';
import { lexicalHasContent } from '@/automations/proto/canvas/flow-utils';

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
// none — which is already a designed state, the one `emptyScenarioId` covers.
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
  /**
   * Out of the working list, still on disk.
   *
   * Its own flag rather than a third `automation.status`, which is how offers do it
   * (`status === 'archived'`, see settings/growth/offers). Two reasons it can't be
   * that here: status comes from admin-x-framework's AutomationDetail and isn't ours
   * to widen, and the two facts are genuinely independent — archiving answers "is
   * this still in front of me", status answers "is it running". Folding them loses
   * which of the two an unarchived automation goes back to being.
   *
   * Archiving stops a live automation as it goes. Unarchiving brings it back OFF,
   * never live: restoring something into a running state is not a thing a publisher
   * should discover after the fact.
   *
   * Optional on read, because records written before this existed don't carry it —
   * see the version note. Everywhere else treats undefined as false.
   */
  archived?: boolean;
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
  /**
   * Which of the site's tiers are archived — site state, same reasoning as
   * stripeConnected, flipped from the lane switcher (a single Bronze toggle
   * demos every display state).
   *
   * Archiving a tier does NOT touch any automation: an archived tier keeps its
   * existing subscribers and stops being offered, so a trigger watching it
   * simply stops firing for it — runs drain out, nothing is disabled, and
   * unarchiving reopens the tap. Configs keep their tierIds untouched; the
   * screens DERIVE the "(archived)" marking at render, so reactivation needs
   * no reconciliation and nothing can go stale.
   */
  archivedTierIds: string[];
}

// Bumping the version discards whatever is in localStorage rather than trying to
// migrate it. This is fixture data behind a Labs flag — a reseed is the correct
// response to a shape change, and a migration path would be ceremony around data
// nobody is going to miss.
// 17: seeded emails carry a written paragraph in email_lexical, so the canvas's
// new empty state (keyed on lexical having children) doesn't fire on fixtures
// that are meant to read as established emails.
// 18: the paid welcome flow seeds the paid trigger — both automations seeded the
// free-signup default, so phase 1's paid flow was titled "Free member signs up".
// 19: TriggerConfig grew tierMode ('all' policy vs 'selected' list); stored
// configs without it would read as selected-with-nothing, i.e. unanswered.
// 20: the store grew archivedTierIds (site state, like stripeConnected).
const VERSION = 20;
const STORAGE_KEY = 'ghost-automations-proto-store';

const seed = (): StoreState => ({
  version: VERSION,
  stripeConnected: true,
  archivedTierIds: [],
  automations: mockAutomations.map((automation) => ({
    automation,
    // The fixture map is the seed now, not the lookup — once a description can be
    // edited, the record has to own it. slug is optional (and deprecated) on
    // AutomationDetail as of the Sep '26 main merge, so the lookup guards it —
    // the fixtures themselves always carry one.
    description: (automation.slug && AUTOMATION_DESCRIPTIONS[automation.slug]) || '',
    // By slug, because which member a production flow is for IS its slug (see
    // mock/automations). Both used to seed the free-signup default, which put
    // "Free member signs up" on the PAID welcome flow's trigger card.
    //
    // The paid fixture takes triggerConfigFor's own default, which is the
    // 'all' policy — a general paid welcome watching every tier, future ones
    // included, is exactly what this fixture is meant to be. (It used to spell
    // every tier out by hand, back when all-tiers-checked was how "any tier"
    // was stored.)
    trigger:
      automation.slug === 'member-welcome-email-paid'
        ? triggerConfigFor('paid_subscription_starts')
        : triggerConfigFor('member_subscribes'),
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

export const useArchivedTierIds = (): string[] =>
  useSyncExternalStore(
    subscribe,
    () => snapshot().archivedTierIds,
    () => snapshot().archivedTierIds,
  );

export const setTierArchived = (tierId: string, archived: boolean): void => {
  const current = snapshot().archivedTierIds;
  commit({
    ...snapshot(),
    archivedTierIds: archived
      ? current.includes(tierId)
        ? current
        : [...current, tierId]
      : current.filter((id) => id !== tierId),
  });
};

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

/**
 * Whether a name is already carried by another automation.
 *
 * One rule for every surface that takes a typed name (the detail header's
 * popover, the list's rename dialog), so they can't disagree about what
 * "taken" means: trimmed, case-insensitive, archived included — an archived
 * automation can come back, and two rows one view apart with one name is the
 * exact confusion this prevents. `excludeId` is the automation being renamed;
 * keeping your own name is a no-op, never an error.
 *
 * Client-side against the loaded store, deliberately: sites hold a handful of
 * automations and the client already has all of them, so the check is free.
 * In production this is the courtesy layer — the API's uniqueness constraint
 * at save is the enforcement, covering two editors racing.
 */
export const isNameTaken = (name: string, excludeId?: string): boolean => {
  const needle = name.trim().toLowerCase();
  return snapshot().automations.some(
    (entry) =>
      entry.automation.id !== excludeId && entry.automation.name.trim().toLowerCase() === needle,
  );
};

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
 * Phase 2's list inserts it immediately and opens it — see handleCreate there. This
 * used to argue the opposite: that nothing should exist until Save, the way Ghost's
 * tag creation works (`/tags/new` holds a local draft; the record appears on save),
 * and that creating on arrival would litter the list with empties.
 *
 * A team run-through settled it the other way. Nothing on the detail screen could
 * say whether the automation existed, and Save meant two different things depending
 * on whether it was the first press. Beehiiv, Kit and Resend all create on arrival
 * for that reason. The empties are real and accepted: an abandoned one is a row with
 * no trigger, which the table already draws as unfinished (a muted generic bolt),
 * and Delete is live on the detail screen from the first frame.
 *
 * The `(2)`, `(3)` numbering was built to cope with that collision. It's now doing
 * the job it was designed for rather than papering over one.
 *
 * The id is minted here so the caller can navigate straight to a real URL, and so
 * nothing has to be re-keyed on the way.
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

/**
 * Commit a draft. This is what Save and Publish both come down to.
 *
 * `description` is optional because the lanes disagree about where details are
 * edited: phase 2's detail screen holds them in the draft (one global Save, and
 * details ride it), so it passes what to write; the others rename through
 * updateAutomationDetails and leave this undefined, which preserves what's there.
 */
export const saveAutomation = (
  id: string,
  automation: AutomationDetail,
  trigger: TriggerConfig | null,
  description?: string,
): void => {
  update((automations) =>
    automations.map((entry) =>
      entry.automation.id === id
        ? {
            ...entry,
            ...(description === undefined ? {} : { description }),
            automation: { ...automation, updated_at: new Date().toISOString() },
            trigger,
          }
        : entry,
    ),
  );
};

/**
 * The automation's name and description, applied immediately.
 *
 * The LIST's rename path, and the older lanes'. Renaming from the list has no
 * draft to ride — the dialog's Save is the only commit in sight, so it writes
 * through. Phase 2's detail screen no longer calls this: there details join the
 * draft and land with the global Save, so the screen only ever has one commit
 * (the cost — a renamed-but-unsaved automation shows its old name on the list —
 * is covered by the same leave guard as every other unsaved edit).
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
 * Whether a SAVED automation is fit to go live, for callers that only have the
 * record — the list's row menu, which offers Publish without a canvas on screen.
 *
 * The same four checks as the detail screen's canGoLive, minus the draft: no
 * trigger, missing Stripe, unanswered tiers, or an email with no subject or no
 * written body all mean an automation that cannot run. The detail screen keeps
 * its own copy because it validates the DRAFT (unsaved edits included), which a
 * record-level check can't see — if the checks change, change both.
 */
export const canPublishAutomation = (
  entry: Pick<ProtoAutomation, 'automation' | 'trigger'>,
  stripeConnected: boolean,
): boolean => {
  const { trigger } = entry;
  if (!trigger) {
    return false;
  }
  if (!stripeConnected && needsStripe(trigger)) {
    return false;
  }
  if (tiersUnanswered(trigger)) {
    return false;
  }
  return !entry.automation.actions.some(
    (action) =>
      action.type === 'send_email' &&
      (!action.data.email_subject.trim() || !lexicalHasContent(action.data.email_lexical)),
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

/**
 * Archive and unarchive.
 *
 * Archiving forces the automation off in the same write. A live automation is
 * enrolling members; leaving it running while it's out of the list would mean work
 * happening where nobody is looking, which is the one outcome archiving must not
 * produce. Unarchiving leaves it off — see the `archived` note.
 */
export const setAutomationArchived = (id: string, archived: boolean): void => {
  update((automations) =>
    automations.map((entry) =>
      entry.automation.id === id
        ? {
            ...entry,
            archived,
            automation: {
              ...entry.automation,
              status: archived ? 'inactive' : entry.automation.status,
            },
          }
        : entry,
    ),
  );
};

/**
 * Still here, deliberately unreachable from the UI.
 *
 * Archive is what the screens offer now. Delete isn't gone because we don't yet know
 * that archive is the answer — most things in Ghost are archived rather than
 * destroyed, but the core content types (posts, pages, tags) really do delete, and
 * the worry that prompted this was losing the history of an old automation. Keeping
 * the write means turning delete back on is a UI change rather than a data-layer one.
 *
 * If archive settles, this goes.
 */
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
