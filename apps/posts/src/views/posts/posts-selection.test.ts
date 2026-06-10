import {
    EMPTY_SELECTION,
    clearSelection,
    hasSelection,
    invertSelection,
    isSelected,
    isSingleSelection,
    selectOnly,
    selectedCount,
    selectionFilter,
    shiftItem,
    toggleItem
} from './posts-selection';
import {describe, expect, it} from 'vitest';

const orderedIds = ['a', 'b', 'c', 'd', 'e'];

describe('posts-selection', () => {
    describe('toggleItem', () => {
        it('selects an unselected item and tracks it as last selected', () => {
            const selection = toggleItem(EMPTY_SELECTION, 'a');

            expect(isSelected(selection, 'a')).toBe(true);
            expect(selection.lastSelectedId).toBe('a');
            expect(isSingleSelection(selection)).toBe(true);
        });

        it('unselects a selected item and clears last selected', () => {
            const selection = toggleItem(toggleItem(EMPTY_SELECTION, 'a'), 'a');

            expect(isSelected(selection, 'a')).toBe(false);
            expect(selection.lastSelectedId).toBe(null);
            expect(hasSelection(selection)).toBe(false);
        });

        it('toggles exclusions when inverted', () => {
            const inverted = invertSelection(EMPTY_SELECTION);
            const selection = toggleItem(inverted, 'a');

            expect(isSelected(selection, 'a')).toBe(false);
            expect(isSelected(selection, 'b')).toBe(true);
        });
    });

    describe('selectOnly', () => {
        it('replaces the selection with a single id', () => {
            const selection = selectOnly('c');

            expect(isSelected(selection, 'c')).toBe(true);
            expect(isSelected(selection, 'a')).toBe(false);
            expect(isSingleSelection(selection)).toBe(true);
        });
    });

    describe('shiftItem', () => {
        it('toggles the item when nothing was selected before', () => {
            const selection = shiftItem(EMPTY_SELECTION, 'b', orderedIds);

            expect(isSelected(selection, 'b')).toBe(true);
            expect(selection.lastSelectedId).toBe('b');
        });

        it('selects the range from the last selected item downwards', () => {
            const selection = shiftItem(toggleItem(EMPTY_SELECTION, 'b'), 'd', orderedIds);

            expect(isSelected(selection, 'a')).toBe(false);
            expect(isSelected(selection, 'b')).toBe(true);
            expect(isSelected(selection, 'c')).toBe(true);
            expect(isSelected(selection, 'd')).toBe(true);
            expect(isSelected(selection, 'e')).toBe(false);
        });

        it('selects the range upwards when clicking above the anchor', () => {
            const selection = shiftItem(toggleItem(EMPTY_SELECTION, 'd'), 'b', orderedIds);

            expect(isSelected(selection, 'b')).toBe(true);
            expect(isSelected(selection, 'c')).toBe(true);
            expect(isSelected(selection, 'd')).toBe(true);
            expect(isSelected(selection, 'e')).toBe(false);
        });

        it('replaces the previous shift range on subsequent shift-clicks', () => {
            const anchored = toggleItem(EMPTY_SELECTION, 'b');
            const firstShift = shiftItem(anchored, 'e', orderedIds);
            const secondShift = shiftItem(firstShift, 'c', orderedIds);

            expect(isSelected(secondShift, 'b')).toBe(true);
            expect(isSelected(secondShift, 'c')).toBe(true);
            expect(isSelected(secondShift, 'd')).toBe(false);
            expect(isSelected(secondShift, 'e')).toBe(false);
        });
    });

    describe('invertSelection', () => {
        it('selects everything when nothing is selected', () => {
            const selection = invertSelection(EMPTY_SELECTION);

            expect(selection.inverted).toBe(true);
            expect(isSelected(selection, 'whatever')).toBe(true);
            expect(hasSelection(selection)).toBe(true);
            expect(isSingleSelection(selection)).toBe(false);
        });

        it('clears exclusions and toggles back on double invert', () => {
            const selection = invertSelection(toggleItem(invertSelection(EMPTY_SELECTION), 'a'));

            expect(selection.inverted).toBe(false);
            expect(hasSelection(selection)).toBe(false);
        });

        it('counts inverted selections against the total', () => {
            const selection = toggleItem(invertSelection(EMPTY_SELECTION), 'a');

            expect(selectedCount(selection, 10)).toBe(9);
            expect(selectedCount(invertSelection(EMPTY_SELECTION), 0)).toBe(1);
        });
    });

    describe('selectionFilter', () => {
        const allFilter = 'status:[draft,scheduled,published,sent]';
        // Valid Mongo-style ObjectIDs, like real post ids
        const idA = '64f1b6f3a3e1c2d4e5f6a7b8';
        const idB = '64f1b6f3a3e1c2d4e5f6a7b9';

        it('returns id:nothing for an empty selection', () => {
            expect(selectionFilter(EMPTY_SELECTION, allFilter)).toBe('id:nothing');
        });

        it('returns an id list for a normal selection', () => {
            const selection = toggleItem(toggleItem(EMPTY_SELECTION, idA), idB);

            expect(selectionFilter(selection, allFilter)).toBe(`id:['${idA}','${idB}']`);
        });

        it('returns the all filter for an inverted selection without exclusions', () => {
            const selection = invertSelection(EMPTY_SELECTION);

            expect(selectionFilter(selection, allFilter)).toBe(allFilter);
        });

        it('returns the all filter with exclusions for an inverted selection', () => {
            const selection = toggleItem(toggleItem(invertSelection(EMPTY_SELECTION), idA), idB);

            expect(selectionFilter(selection, allFilter)).toBe(`(${allFilter})+id:-['${idA}','${idB}']`);
        });

        it('handles inverted selections without an all filter', () => {
            expect(selectionFilter(invertSelection(EMPTY_SELECTION), '')).toBe('');
            expect(selectionFilter(toggleItem(invertSelection(EMPTY_SELECTION), idA), '')).toBe(`id:-['${idA}']`);
        });

        it('drops ids that are not well-formed ObjectIDs', () => {
            const injected = `${idA}'])+status:draft`;
            const selection = toggleItem(toggleItem(EMPTY_SELECTION, idA), injected);

            expect(selectionFilter(selection, allFilter)).toBe(`id:['${idA}']`);
        });

        it('returns id:nothing when every selected id is malformed', () => {
            const selection = toggleItem(EMPTY_SELECTION, 'not-an-object-id');

            expect(selectionFilter(selection, allFilter)).toBe('id:nothing');
        });

        it('ignores malformed exclusions in inverted selections', () => {
            const selection = toggleItem(invertSelection(EMPTY_SELECTION), 'not-an-object-id');

            expect(selectionFilter(selection, allFilter)).toBe(allFilter);
        });
    });

    describe('clearSelection', () => {
        it('resets everything', () => {
            const selection = clearSelection();

            expect(hasSelection(selection)).toBe(false);
            expect(selection.inverted).toBe(false);
            expect(selection.lastSelectedId).toBe(null);
        });
    });
});
