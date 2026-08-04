import {computeShiftRange} from '@/posts/list/compute-shift-range';

/**
 * Selection state for the posts list, ported from `SelectionList` in
 * `apps/ember-admin/app/components/posts-list/selection-list.js`.
 *
 * A plain reducer rather than a hook so the semantics can be tested as data.
 * The freeze/unfreeze machinery Ember uses to hold a selection open while its
 * context menu is up is not here — that is a Phase 7 concern, and Radix keeps
 * the menu's own state, so it becomes a single "transient" flag instead.
 */

export interface PostSelectionState {
    /**
     * While `inverted`, this holds the rows taken *out* of the selection, not
     * the rows put into it. Every reader has to account for both meanings.
     */
    selectedIds: Set<string>;
    inverted: boolean;
    /** Where the next shift-click ranges from. */
    lastSelectedId: string | null;
    /**
     * The rows the previous shift-click added, so the next one can undo them.
     * Recomputing the range instead would wrongly undo rows the user had
     * selected by hand before shift-clicking.
     */
    lastShiftGroup: Set<string>;
}

export type PostSelectionAction =
    | {type: 'toggle'; id: string}
    | {type: 'shift'; id: string; orderedIds: string[]}
    | {type: 'selectAll'}
    | {type: 'clear'};

export function createPostSelection(): PostSelectionState {
    return {
        selectedIds: new Set(),
        inverted: false,
        lastSelectedId: null,
        lastShiftGroup: new Set()
    };
}

export const initialPostSelection: PostSelectionState = createPostSelection();

export function isPostSelected(state: PostSelectionState, id: string): boolean {
    return state.inverted ? !state.selectedIds.has(id) : state.selectedIds.has(id);
}

/** Whether exactly one post is selected — an inverted selection never is. */
export function isSinglePostSelected(state: PostSelectionState): boolean {
    return !state.inverted && state.selectedIds.size === 1;
}

/**
 * @param total the server's count for the current filter. Inverted selections
 * cover rows that were never loaded, so the count can't come from the array.
 */
export function getPostSelectionCount(state: PostSelectionState, total: number): number {
    if (!state.inverted) {
        return state.selectedIds.size;
    }

    // Floored at 1, as Ember does: `total` lags behind while pages load, so the
    // subtraction can otherwise go negative and read "-3 posts selected".
    return Math.max(total - state.selectedIds.size, 1);
}

function toggle(state: PostSelectionState, id: string): PostSelectionState {
    const selectedIds = new Set(state.selectedIds);
    const wasPresent = selectedIds.delete(id);

    if (!wasPresent) {
        selectedIds.add(id);
    }

    // Three outcomes, not two. Selecting a row always anchors it. Deselecting
    // only clears the anchor when the row *is* the anchor — deselecting some
    // other row leaves the anchor where the user put it. Inverted mode anchors
    // on every touch, since there "deselect" is the primary gesture.
    let lastSelectedId = state.lastSelectedId;

    if (!wasPresent || state.inverted) {
        lastSelectedId = id;
    } else if (state.lastSelectedId === id) {
        lastSelectedId = null;
    }

    return {
        selectedIds,
        inverted: state.inverted,
        lastSelectedId,
        lastShiftGroup: new Set()
    };
}

function shift(state: PostSelectionState, id: string, orderedIds: string[]): PostSelectionState {
    if (state.lastSelectedId === null) {
        return toggle(state, id);
    }

    const selectedIds = new Set(state.selectedIds);

    // Undo the previous range first. In inverted mode "selected" means absent
    // from the set, so adding and removing swap over throughout.
    state.lastShiftGroup.forEach((previous) => {
        if (state.inverted) {
            selectedIds.add(previous);
        } else {
            selectedIds.delete(previous);
        }
    });

    const range = computeShiftRange(orderedIds, state.lastSelectedId, id);

    range.forEach((rangeId) => {
        if (state.inverted) {
            selectedIds.delete(rangeId);
        } else {
            selectedIds.add(rangeId);
        }
    });

    return {
        selectedIds,
        inverted: state.inverted,
        // The anchor deliberately does not move, so a second shift-click
        // re-ranges from the original click rather than chaining off the last.
        lastSelectedId: state.lastSelectedId,
        lastShiftGroup: new Set(range)
    };
}

export function postSelectionReducer(
    state: PostSelectionState,
    action: PostSelectionAction
): PostSelectionState {
    switch (action.type) {
    case 'toggle':
        return toggle(state, action.id);
    case 'shift':
        return shift(state, action.id, action.orderedIds);
    case 'selectAll':
        // Inverting rather than enumerating is the whole point: it covers rows
        // that were never loaded, so a bulk action on a 2,000-post site sends a
        // filter instead of 2,000 ids.
        return {
            selectedIds: new Set(),
            inverted: !state.inverted,
            lastSelectedId: null,
            lastShiftGroup: new Set()
        };
    case 'clear':
        // A fresh object rather than the shared constant: handing out the same
        // Sets everywhere means one stray in-place mutation would corrupt the
        // module-level value for the lifetime of the app.
        return createPostSelection();
    default:
        return state;
    }
}
