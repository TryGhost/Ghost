/**
 * Pure selection model for the posts/pages list, mirroring the semantics of
 * the Ember `SelectionList` (set of ids + inverted flag).
 */
export interface PostsSelection {
    selectedIds: ReadonlySet<string>;
    inverted: boolean;
    lastSelectedId: string | null;
    lastShiftSelectionGroup: ReadonlySet<string>;
}

export const EMPTY_SELECTION: PostsSelection = {
    selectedIds: new Set<string>(),
    inverted: false,
    lastSelectedId: null,
    lastShiftSelectionGroup: new Set<string>()
};

export function clearSelection(): PostsSelection {
    return EMPTY_SELECTION;
}

export function isSelected(selection: PostsSelection, id: string): boolean {
    if (selection.inverted) {
        return !selection.selectedIds.has(id);
    }
    return selection.selectedIds.has(id);
}

export function hasSelection(selection: PostsSelection): boolean {
    return selection.inverted || selection.selectedIds.size > 0;
}

export function isSingleSelection(selection: PostsSelection): boolean {
    return !selection.inverted && selection.selectedIds.size === 1;
}

export function selectedCount(selection: PostsSelection, totalItems: number): number {
    if (!selection.inverted) {
        return selection.selectedIds.size;
    }
    return Math.max(totalItems - selection.selectedIds.size, 1);
}

/** Ctrl/meta-click: toggle a single item in or out of the selection */
export function toggleItem(selection: PostsSelection, id: string): PostsSelection {
    const selectedIds = new Set(selection.selectedIds);
    let lastSelectedId = selection.lastSelectedId;

    if (selectedIds.has(id)) {
        selectedIds.delete(id);
        if (selection.inverted) {
            lastSelectedId = id;
        } else if (lastSelectedId === id) {
            lastSelectedId = null;
        }
    } else {
        selectedIds.add(id);
        lastSelectedId = id;
    }

    return {
        selectedIds,
        inverted: selection.inverted,
        lastSelectedId,
        lastShiftSelectionGroup: new Set<string>()
    };
}

/** Right-click on an unselected row: select only that row */
export function selectOnly(id: string): PostsSelection {
    return {
        selectedIds: new Set([id]),
        inverted: false,
        lastSelectedId: id,
        lastShiftSelectionGroup: new Set<string>()
    };
}

/**
 * Shift-click: select the range between the last selected item and `id`,
 * following `orderedIds` (the flattened section order). A subsequent
 * shift-click replaces the previous shift range, like in Ember.
 */
export function shiftItem(selection: PostsSelection, id: string, orderedIds: string[]): PostsSelection {
    if (selection.lastSelectedId === null) {
        return toggleItem(selection, id);
    }

    const fromIndex = orderedIds.indexOf(selection.lastSelectedId);
    const toIndex = orderedIds.indexOf(id);
    if (fromIndex === -1 || toIndex === -1) {
        return toggleItem(selection, id);
    }

    const selectedIds = new Set(selection.selectedIds);

    // Undo the previous shift-selection group
    for (const previousId of selection.lastShiftSelectionGroup) {
        if (selection.inverted) {
            selectedIds.add(previousId);
        } else {
            selectedIds.delete(previousId);
        }
    }

    const [start, end] = fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
    const group = new Set<string>();
    for (let i = start; i <= end; i += 1) {
        const rangeId = orderedIds[i];
        if (rangeId === selection.lastSelectedId) {
            continue;
        }
        group.add(rangeId);
        if (selection.inverted) {
            selectedIds.delete(rangeId);
        } else {
            selectedIds.add(rangeId);
        }
    }

    return {
        selectedIds,
        inverted: selection.inverted,
        lastSelectedId: selection.lastSelectedId,
        lastShiftSelectionGroup: group
    };
}

/** Cmd/ctrl+A: invert the selection (select all / none) */
export function invertSelection(selection: PostsSelection): PostsSelection {
    return {
        selectedIds: new Set<string>(),
        inverted: !selection.inverted,
        lastSelectedId: null,
        lastShiftSelectionGroup: new Set<string>()
    };
}

/** Post ids are Mongo-style ObjectIDs; anything else would be injected into NQL filters */
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

function validIds(ids: ReadonlySet<string>): string[] {
    return [...ids].filter(id => OBJECT_ID_PATTERN.test(id));
}

function quoteIds(ids: string[]): string {
    return `'${ids.join('\',\'')}'`;
}

/**
 * NQL filter for the current selection, used by the bulk edit/delete APIs.
 * Mirrors Ember's `SelectionList.filter`. Ids that aren't well-formed
 * ObjectIDs are dropped as a client-side NQL-injection defense.
 */
export function selectionFilter(selection: PostsSelection, allFilter: string): string {
    const ids = validIds(selection.selectedIds);

    if (selection.inverted) {
        if (allFilter) {
            if (ids.length === 0) {
                return allFilter;
            }
            return `(${allFilter})+id:-[${quoteIds(ids)}]`;
        }
        if (ids.length === 0) {
            return '';
        }
        return `id:-[${quoteIds(ids)}]`;
    }
    if (ids.length === 0) {
        return 'id:nothing';
    }
    return `id:[${quoteIds(ids)}]`;
}
