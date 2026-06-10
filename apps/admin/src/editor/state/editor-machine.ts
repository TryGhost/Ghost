/**
 * Pure editor state machine for the React editor port.
 *
 * Ported from the Ember LexicalEditorController
 * (ghost/admin/app/controllers/lexical-editor.js). The machine owns scratch
 * state, the last-saved post snapshot, dirty detection, the save lifecycle
 * (including concurrent-save rules) and status transitions. It performs NO
 * side effects itself: every transition returns the next state plus a list of
 * effect directives (timers to (re)start/cancel, saves to perform) that the
 * caller — typically a React hook — executes.
 *
 * This module must stay free of React/DOM/network dependencies.
 */

/** Time in ms to save after the last content edit (Ember AUTOSAVE_TIMEOUT). */
export const AUTOSAVE_DELAY = 3000;
/** Time in ms to force a save while the user is continuously typing (Ember TIMEDSAVE_TIMEOUT). */
export const TIMED_SAVE_INTERVAL = 60000;
/** Title applied when saving a post with a blank title. */
export const DEFAULT_TITLE = "(Untitled)";

export type PostStatus = "draft" | "published" | "scheduled" | "sent";

export type SaveKind = "autosave" | "timed" | "manual" | "leave";

export type SaveErrorType = "conflict" | "host-limit" | "not-found" | "offline" | "generic";

export interface SaveError {
    type: SaveErrorType;
    message: string;
}

/**
 * Minimal local snapshot of the post as last persisted. Deliberately not the
 * framework Post type — the machine only models the fields it reasons about.
 * `tags` is the array of tag names (mirrors Ember's `_previousTagNames`).
 */
export interface PostSnapshot {
    id: string | null;
    status: PostStatus;
    title: string;
    lexical: string | null;
    customExcerpt: string | null;
    slug: string;
    tags: string[];
    /** UTC ISO string (`published_at`), null for never-published drafts. */
    publishedAt: string | null;
    featureImage: string | null;
    updatedAt: string | null;
}

/** What the caller should send to the API when executing a `save/perform` effect. */
export interface SavePayload {
    id: string | null;
    status: PostStatus;
    title: string;
    lexical: string | null;
    customExcerpt: string | null;
    tags: string[];
    slug: string;
    publishedAt: string | null;
    featureImage: string | null;
}

/**
 * A save request waiting behind an in-flight save. The full intent is queued
 * (not just the kind) so a queued publish stays a publish and a queued
 * unschedule still clears the publish date after the in-flight save's
 * SAVE_SUCCEEDED resynced willPublish/willSchedule from the persisted status.
 */
export interface QueuedSaveIntent {
    kind: SaveKind;
    saveType?: "publish" | "schedule" | "draft";
    /** publishedAt carried by the request; undefined = not touched, null = clear. */
    publishedAt?: string | null;
    pastScheduledTime?: boolean;
}

/** Settings-field values a save sent, used to decide whether to resync the scratch. */
export interface SentSettingsFields {
    slug: string;
    publishedAt: string | null;
    featureImage: string | null;
}

export type SavePhase =
    | { status: "idle" }
    | {
        status: "saving";
        kind: SaveKind;
        /** Status before this save attempt; restored on SAVE_FAILED (Ember line 676). */
        prevStatus: PostStatus;
        /** Settings values this save sent; scratches only resync from the response when unchanged since. */
        sent: SentSettingsFields;
        /** Save requested while this one was in flight; latest-wins, manual/leave outrank background. */
        queued: QueuedSaveIntent | null;
    }
    | { status: "error"; kind: SaveKind; error: SaveError };

export interface EditorState {
    /** Last-saved snapshot (null until POST_LOADED). */
    post: PostSnapshot | null;
    /** In-flight edits, separate from the saved snapshot (Ember scratch fields). */
    titleScratch: string;
    lexicalScratch: string | null;
    customExcerptScratch: string | null;
    tagNamesScratch: string[];
    /**
     * Save-immediately settings fields (slug / publish date / feature image).
     * Unlike the content scratches these mirror Ember's "set the model
     * attribute and save right away" PSM fields: they're written on commit
     * (not per keystroke) and resynced from the server snapshot after every
     * successful save (Ember `boundOneWay('post.slug')` semantics).
     */
    slugScratch: string;
    publishedAtScratch: string | null;
    featureImageScratch: string | null;
    /** Desired status, applied only on manual save (Ember willPublish/willSchedule). */
    willPublish: boolean;
    willSchedule: boolean;
    save: SavePhase;
    /** Set by the caller once the user confirmed the "are you sure?" leave modal. */
    leaveConfirmed: boolean;
    /** Set after a successful leave-save to avoid save-on-leave loops. */
    saveOnLeavePerformed: boolean;
}

export type EditorEvent =
    | { type: "POST_LOADED"; post: PostSnapshot }
    | { type: "SCRATCH_CHANGED"; field: "title" | "lexical" | "customExcerpt" | "slug" | "publishedAt" | "featureImage"; value: string | null }
    | { type: "TAGS_CHANGED"; tagNames: string[] }
    | { type: "SET_SAVE_TYPE"; saveType: "publish" | "schedule" | "draft" }
    | {
        type: "SAVE_REQUESTED";
        kind: SaveKind;
        /** Status intent applied with this save (Ember PublishOptions._applyModelChanges). */
        saveType?: "publish" | "schedule" | "draft";
        /** published_at applied with this save; undefined = keep, null = clear (unschedule). */
        publishedAt?: string | null;
        /** Caller-computed `post.pastScheduledTime` (keeps the machine clock-free). */
        pastScheduledTime?: boolean;
    }
    | { type: "SAVE_SUCCEEDED"; post: PostSnapshot }
    | { type: "SAVE_FAILED"; error: SaveError }
    | { type: "CANCEL_AUTOSAVE" }
    | { type: "LEAVE_CONFIRMED" }
    | { type: "RESET" };

/**
 * Effect directives. Timers live in the caller (a hook); the machine only
 * decides what should happen to them. When an autosave/timed-save timer
 * fires, the caller dispatches SAVE_REQUESTED with the matching kind. When a
 * `save/perform` effect is returned, the caller performs the API request and
 * dispatches SAVE_SUCCEEDED/SAVE_FAILED.
 */
export type EditorEffect =
    | { type: "timer/restart-autosave"; delayMs: number }
    | { type: "timer/ensure-timed-save"; intervalMs: number }
    | { type: "timer/cancel-all" }
    | { type: "save/perform"; kind: SaveKind; payload: SavePayload };

export interface TransitionResult {
    state: EditorState;
    effects: EditorEffect[];
}

export function createInitialState(): EditorState {
    return {
        post: null,
        titleScratch: "",
        lexicalScratch: null,
        customExcerptScratch: null,
        tagNamesScratch: [],
        slugScratch: "",
        publishedAtScratch: null,
        featureImageScratch: null,
        willPublish: false,
        willSchedule: false,
        save: { status: "idle" },
        leaveConfirmed: false,
        saveOnLeavePerformed: false,
    };
}

/* Dirty detection ----------------------------------------------------------*/

function lexicalChildNodes(serialized: string | null): Array<Record<string, unknown>> {
    if (!serialized) {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(serialized);
        if (typeof parsed !== "object" || parsed === null) {
            return [];
        }
        const children = (parsed as { root?: { children?: unknown } }).root?.children;
        return Array.isArray(children) ? (children as Array<Record<string, unknown>>) : [];
    } catch {
        return [];
    }
}

/**
 * Serialize the top-level child nodes for comparison, ignoring the
 * formatting-irrelevant `direction` field. Matches Ember's
 * `child.direction = null` loop which only touches top-level children
 * (nested `direction` differences ARE significant, as in Ember).
 */
function comparableLexical(serialized: string | null): string {
    const children = lexicalChildNodes(serialized).map(child => ({ ...child, direction: null }));
    return JSON.stringify(children);
}

/**
 * Pure port of Ember's `_hasDirtyAttributes` (lines 1444-1547):
 *
 * 1. a failed save keeps the post dirty (Ember `post.isError`)
 * 2. tag names compared as joined strings — reorders ARE dirty
 * 3. trimmed-title comparison — whitespace-only changes are NOT dirty
 * 4. lexical child-node comparison ignoring top-level `direction`, only when
 *    both sides are present (Ember requires `lexical && scratch`)
 * 5. excerpt/slug/publish-date/feature-image scratch vs snapshot — the analog
 *    of both Ember's new-post `changedAttributes()` check and Ember Data's
 *    fallback dirty check for the remaining attributes this machine models
 *    (the settings fields normally save immediately on commit, so they're
 *    only dirty between commit and save completion, or after a failed save)
 */
export function hasDirtyAttributes(state: EditorState): boolean {
    const post = state.post;

    if (!post) {
        return false;
    }

    if (state.save.status === "error") {
        return true;
    }

    if (state.tagNamesScratch.join(", ") !== post.tags.join(", ")) {
        return true;
    }

    if (state.titleScratch.trim() !== post.title.trim()) {
        return true;
    }

    if (post.lexical && state.lexicalScratch
        && comparableLexical(post.lexical) !== comparableLexical(state.lexicalScratch)) {
        return true;
    }

    return state.customExcerptScratch !== post.customExcerpt
        || state.slugScratch !== post.slug
        || state.publishedAtScratch !== post.publishedAt
        || state.featureImageScratch !== post.featureImage;
}

/* Leave decision ------------------------------------------------------------*/

export interface LeaveDecision {
    /** Dirty drafts save silently on leave (revision save), no modal. */
    shouldSaveOnLeave: boolean;
    /** Dirty published/scheduled/sent posts (or drafts still dirty after a leave-save) need the "are you sure?" modal. */
    shouldConfirmLeave: boolean;
}

/**
 * Pure port of Ember's `_getLeaveTransitionState` (lines 1276-1319), minus
 * the deleted-record and new->edit special cases which live at the routing
 * layer. After a leave-save the caller re-evaluates: a clean post yields
 * {false, false}; a still-dirty draft (leave-save performed but state still
 * dirty) escalates to confirmation.
 */
export function getLeaveDecision(state: EditorState): LeaveDecision {
    if (!state.post) {
        return { shouldSaveOnLeave: false, shouldConfirmLeave: false };
    }

    const dirty = hasDirtyAttributes(state);

    const shouldSaveOnLeave = !state.saveOnLeavePerformed
        && dirty
        && state.post.status === "draft";

    const shouldConfirmLeave = !state.leaveConfirmed
        && dirty
        && !shouldSaveOnLeave;

    return { shouldSaveOnLeave, shouldConfirmLeave };
}

/* Past-scheduled-time --------------------------------------------------------*/

/**
 * Pure port of Ember's `post.pastScheduledTime` (models/post.js lines
 * 279-292): a scheduled post whose publish date has already passed. The
 * machine itself stays clock-free — callers compute this at dispatch time
 * and pass it with SAVE_REQUESTED. `publishedAtOverride` lets callers apply
 * the publishedAt carried by the same request (Ember computes the flag after
 * `_applyModelChanges` set the model's publish date).
 */
export function isPastScheduledTime(
    state: EditorState,
    nowMs: number,
    publishedAtOverride?: string | null,
): boolean {
    if (state.post?.status !== "scheduled") {
        return false;
    }

    const publishedAt = publishedAtOverride !== undefined ? publishedAtOverride : state.publishedAtScratch;
    return publishedAt !== null && Date.parse(publishedAt) < nowMs;
}

/* Status computation ---------------------------------------------------------*/

/**
 * Port of the status block in Ember's saveTask (lines 609-639):
 * - leave-saves never change status
 * - background saves force 'draft' (never publish from an autosave)
 * - manual saves apply the willPublish/willSchedule intents; 'sent' is terminal
 */
function computeNextStatus(state: EditorState, kind: SaveKind, pastScheduledTime: boolean): PostStatus {
    const current = (state.post as PostSnapshot).status;

    if (kind === "leave") {
        return current;
    }

    if (kind === "autosave" || kind === "timed") {
        return "draft";
    }

    if (pastScheduledTime) {
        return (!state.willSchedule && !state.willPublish) ? "draft" : "published";
    }

    if (state.willPublish && current !== "scheduled") {
        return "published";
    }

    if (state.willSchedule && current !== "published") {
        return "scheduled";
    }

    if (current === "sent") {
        return "sent";
    }

    return "draft";
}

/* Transition -----------------------------------------------------------------*/

function noop(state: EditorState): TransitionResult {
    return { state, effects: [] };
}

function isBackgroundKind(kind: SaveKind): boolean {
    return kind === "autosave" || kind === "timed";
}

/**
 * Begin a save: compute the target status, normalize a blank title to
 * '(Untitled)' and copy scratch values into the payload (Ember
 * beforeSaveTask). The in-flight status is applied to the snapshot
 * immediately, mirroring Ember setting `post.status` before the request, and
 * reverted on SAVE_FAILED. All saves cancel pending autosave timers
 * (Ember's `cancelAutosave()` at the top of saveTask).
 */
function startSave(state: EditorState, kind: SaveKind, pastScheduledTime: boolean): TransitionResult {
    const post = state.post as PostSnapshot;
    const nextStatus = computeNextStatus(state, kind, pastScheduledTime);
    const titleScratch = state.titleScratch.trim() ? state.titleScratch : DEFAULT_TITLE;

    const payload: SavePayload = {
        id: post.id,
        status: nextStatus,
        title: titleScratch,
        lexical: state.lexicalScratch || null,
        customExcerpt: state.customExcerptScratch,
        tags: [...state.tagNamesScratch],
        slug: state.slugScratch,
        publishedAt: state.publishedAtScratch,
        featureImage: state.featureImageScratch,
    };

    return {
        state: {
            ...state,
            titleScratch,
            post: { ...post, status: nextStatus },
            save: {
                status: "saving",
                kind,
                prevStatus: post.status,
                sent: {
                    slug: state.slugScratch,
                    publishedAt: state.publishedAtScratch,
                    featureImage: state.featureImageScratch,
                },
                queued: null,
            },
        },
        effects: [
            { type: "timer/cancel-all" },
            { type: "save/perform", kind, payload },
        ],
    };
}

export function transition(state: EditorState, event: EditorEvent): TransitionResult {
    switch (event.type) {
        case "POST_LOADED": {
            const post = event.post;
            return {
                state: {
                    ...createInitialState(),
                    post,
                    titleScratch: post.title,
                    lexicalScratch: post.lexical,
                    customExcerptScratch: post.customExcerpt,
                    tagNamesScratch: [...post.tags],
                    slugScratch: post.slug,
                    publishedAtScratch: post.publishedAt,
                    featureImageScratch: post.featureImage,
                    willPublish: post.status === "published",
                    willSchedule: post.status === "scheduled",
                },
                effects: [{ type: "timer/cancel-all" }],
            };
        }

        case "SCRATCH_CHANGED": {
            if (!state.post) {
                return noop(state);
            }

            const next = { ...state };
            if (event.field === "title") {
                next.titleScratch = event.value ?? "";
            } else if (event.field === "lexical") {
                next.lexicalScratch = event.value;
            } else if (event.field === "slug") {
                next.slugScratch = event.value ?? "";
            } else if (event.field === "publishedAt") {
                next.publishedAtScratch = event.value;
            } else if (event.field === "featureImage") {
                next.featureImageScratch = event.value;
            } else {
                next.customExcerptScratch = event.value;
            }

            const effects: EditorEffect[] = [];

            // Body edits schedule autosaves (Ember updateScratch), and only
            // for drafts (_canAutosave). New unsaved posts save immediately
            // (0ms debounce) on their first content edit — title or body —
            // so the draft gets created and the URL can swap to /editor/:id.
            // Title edits to an existing post don't autosave; they save on
            // blur via saveTitle (Ember saveTitleTask).
            const isNew = state.post.id === null;
            const schedulesAutosave = event.field === "lexical" || (isNew && event.field === "title");
            if (schedulesAutosave && state.post.status === "draft") {
                effects.push({
                    type: "timer/restart-autosave",
                    delayMs: isNew ? 0 : AUTOSAVE_DELAY,
                });
                effects.push({
                    type: "timer/ensure-timed-save",
                    intervalMs: TIMED_SAVE_INTERVAL,
                });
            }

            return { state: next, effects };
        }

        case "TAGS_CHANGED": {
            if (!state.post) {
                return noop(state);
            }
            return noop({ ...state, tagNamesScratch: [...event.tagNames] });
        }

        case "SET_SAVE_TYPE": {
            if (event.saveType === "publish") {
                return noop({ ...state, willPublish: true, willSchedule: false });
            }
            if (event.saveType === "schedule") {
                return noop({ ...state, willPublish: false, willSchedule: true });
            }
            return noop({ ...state, willPublish: false, willSchedule: false });
        }

        case "SAVE_REQUESTED": {
            if (!state.post) {
                return noop(state);
            }

            const background = isBackgroundKind(event.kind);

            // background saves only run for drafts (Ember _canAutosave)
            if (background && state.post.status !== "draft") {
                return noop(state);
            }

            // apply the intent carried by the request (publish flow's
            // saveType / publishedAt) before anything else — like Ember's
            // PublishOptions._applyModelChanges running before post.save()
            let next = state;
            if (event.saveType) {
                next = transition(next, { type: "SET_SAVE_TYPE", saveType: event.saveType }).state;
            }
            if (event.publishedAt !== undefined && event.publishedAt !== next.publishedAtScratch) {
                next = transition(next, { type: "SCRATCH_CHANGED", field: "publishedAt", value: event.publishedAt }).state;
            }

            // a save is in flight: never run concurrently — enqueue the full
            // intent with latest-wins (later requests without an explicit
            // saveType/publishedAt inherit the queued ones so a settings
            // blur-save can't strip a queued publish); manual/leave saves
            // supersede pending background saves but are never downgraded
            if (next.save.status === "saving") {
                const queued = next.save.queued;
                if (background && (queued?.kind === "manual" || queued?.kind === "leave")) {
                    return noop(next);
                }
                const merged: QueuedSaveIntent = {
                    kind: event.kind,
                    saveType: event.saveType ?? queued?.saveType,
                    publishedAt: event.publishedAt !== undefined ? event.publishedAt : queued?.publishedAt,
                    pastScheduledTime: event.pastScheduledTime ?? queued?.pastScheduledTime,
                };
                return noop({ ...next, save: { ...next.save, queued: merged } });
            }

            // background saves are skipped when nothing changed; like Ember's
            // saveTask they still cancel pending timers (cancelAutosave runs
            // before the dirty check). Leave-saves bypass the dirty check.
            if (background && !hasDirtyAttributes(next)) {
                return { state: next, effects: [{ type: "timer/cancel-all" }] };
            }

            return startSave(next, event.kind, event.pastScheduledTime ?? false);
        }

        case "SAVE_SUCCEEDED": {
            if (state.save.status !== "saving") {
                return noop(state);
            }

            const { kind, queued, sent } = state.save;
            const post = event.post;

            const next: EditorState = {
                ...state,
                post,
                // settings fields resync from the persisted snapshot (Ember
                // boundOneWay('post.slug') — the server may have normalized
                // the slug for uniqueness or the publish date's precision),
                // but only when the scratch still holds the value this save
                // sent: edits made while the save was in flight must survive
                slugScratch: state.slugScratch === sent.slug ? post.slug : state.slugScratch,
                publishedAtScratch: state.publishedAtScratch === sent.publishedAt ? post.publishedAt : state.publishedAtScratch,
                featureImageScratch: state.featureImageScratch === sent.featureImage ? post.featureImage : state.featureImageScratch,
                // re-derive intents from the persisted status (Ember boundOneWay)
                willPublish: post.status === "published",
                willSchedule: post.status === "scheduled",
                save: { status: "idle" },
                saveOnLeavePerformed: state.saveOnLeavePerformed || kind === "leave",
            };

            // run the queued save against the fresh snapshot, re-applying its
            // full intent (the resync above re-derived willPublish/willSchedule
            // from the persisted status); queued background saves no-op if the
            // save made the state clean
            if (queued) {
                return transition(next, {
                    type: "SAVE_REQUESTED",
                    kind: queued.kind,
                    saveType: queued.saveType,
                    publishedAt: queued.publishedAt,
                    pastScheduledTime: queued.pastScheduledTime,
                });
            }

            return noop(next);
        }

        case "SAVE_FAILED": {
            if (state.save.status !== "saving") {
                return noop(state);
            }

            return noop({
                ...state,
                // revert the in-flight status (Ember line 676)
                post: state.post ? { ...state.post, status: state.save.prevStatus } : null,
                // reset the intents to match the reverted status (Ember
                // _revertModelChanges) so a later plain manual save — e.g. a
                // settings blur — doesn't unexpectedly re-attempt the publish
                willPublish: state.save.prevStatus === "published",
                willSchedule: state.save.prevStatus === "scheduled",
                save: { status: "error", kind: state.save.kind, error: event.error },
            });
        }

        case "CANCEL_AUTOSAVE": {
            return { state, effects: [{ type: "timer/cancel-all" }] };
        }

        case "LEAVE_CONFIRMED": {
            return noop({ ...state, leaveConfirmed: true });
        }

        case "RESET": {
            return { state: createInitialState(), effects: [{ type: "timer/cancel-all" }] };
        }
    }
}
