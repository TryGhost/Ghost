import {describe, expect, it} from 'vitest';
import {
    getPostSelectionCount,
    initialPostSelection,
    isPostSelected,
    isSinglePostSelected,
    postSelectionReducer,
    type PostSelectionAction,
    type PostSelectionState
} from './post-selection-state';

/**
 * Selection semantics, ported from `posts-list/selection-list.js`.
 *
 * The load-bearing idea: after Select All the selection is *inverted*, and
 * `selectedIds` flips meaning from "the chosen rows" to "the rows taken out".
 * Every operation has to read correctly in both modes, and most of the bugs
 * available here are a branch that only considered one of them.
 */

const ids = ['a', 'b', 'c', 'd', 'e'];

function run(actions: PostSelectionAction[], from: PostSelectionState = initialPostSelection): PostSelectionState {
    return actions.reduce(postSelectionReducer, from);
}

const selected = (state: PostSelectionState) => ids.filter(id => isPostSelected(state, id));

describe('postSelectionReducer', () => {
    describe('toggle', () => {
        it('selects an unselected row', () => {
            expect(selected(run([{type: 'toggle', id: 'b'}]))).toEqual(['b']);
        });

        it('deselects a selected row', () => {
            expect(selected(run([{type: 'toggle', id: 'b'}, {type: 'toggle', id: 'b'}]))).toEqual([]);
        });

        it('anchors the next shift-click on the row just toggled', () => {
            expect(run([{type: 'toggle', id: 'b'}]).lastSelectedId).toBe('b');
        });

        // Otherwise a shift-click after deselecting would range from a row the
        // user just took out of the selection.
        it('drops the anchor when the anchored row is deselected', () => {
            expect(run([{type: 'toggle', id: 'b'}, {type: 'toggle', id: 'b'}]).lastSelectedId).toBeNull();
        });

        // Ember only clears the anchor when the row being deselected *is* the
        // anchor; deselecting any other row leaves it where it was. Moving the
        // anchor onto a just-deselected row would make the next shift-click
        // range from somewhere the user did not choose.
        it('leaves the anchor alone when a different row is deselected', () => {
            const state = run([
                {type: 'toggle', id: 'c'},
                {type: 'toggle', id: 'a'},
                {type: 'toggle', id: 'c'}
            ]);

            expect(state.lastSelectedId).toBe('a');
        });

        it('ranges from the untouched anchor on the shift-click that follows', () => {
            const state = run([
                {type: 'toggle', id: 'c'},
                {type: 'toggle', id: 'a'},
                {type: 'toggle', id: 'c'},
                {type: 'shift', id: 'e', orderedIds: ids}
            ]);

            expect(selected(state)).toEqual(['a', 'b', 'c', 'd', 'e']);
        });

        it('takes a row out of an inverted selection', () => {
            const state = run([{type: 'selectAll'}, {type: 'toggle', id: 'b'}]);

            expect(state.inverted).toBe(true);
            expect(selected(state)).toEqual(['a', 'c', 'd', 'e']);
        });
    });

    describe('shift', () => {
        it('falls back to a plain toggle with no anchor', () => {
            expect(selected(run([{type: 'shift', id: 'c', orderedIds: ids}]))).toEqual(['c']);
        });

        it('selects the range from the anchor', () => {
            const state = run([{type: 'toggle', id: 'b'}, {type: 'shift', id: 'd', orderedIds: ids}]);

            expect(selected(state)).toEqual(['b', 'c', 'd']);
        });

        // The anchor does not move — Ember's `shiftItem` never reassigns it —
        // so a second shift-click re-ranges from the original click.
        it('re-ranges from the same anchor and undoes the previous range', () => {
            const state = run([
                {type: 'toggle', id: 'b'},
                {type: 'shift', id: 'e', orderedIds: ids},
                {type: 'shift', id: 'c', orderedIds: ids}
            ]);

            expect(state.lastSelectedId).toBe('b');
            expect(selected(state)).toEqual(['b', 'c']);
        });

        // A row selected by hand before the shift must survive the undo, which
        // is why the previous range is remembered rather than recomputed.
        it('leaves rows selected outside the previous range alone', () => {
            const state = run([
                {type: 'toggle', id: 'e'},
                {type: 'toggle', id: 'a'},
                {type: 'shift', id: 'c', orderedIds: ids},
                {type: 'shift', id: 'b', orderedIds: ids}
            ]);

            expect(selected(state)).toEqual(['a', 'b', 'e']);
        });

        /**
         * Inverted shift puts the range *back into* the selection rather than
         * taking it out — the opposite of what toggle does in the same mode.
         *
         * That reads like a bug, and Ember's own source says so: `toggleItem`
         * carries a `// Shift behaviour in inverted mode needs a review`
         * comment, and no Ember test covers it. It is ported as-is anyway.
         * "This looks wrong to me" is not the same as "this diverges from the
         * thing we are porting", and fixing it here would make the two
         * implementations disagree while the flag is still switchable.
         *
         * Worth raising as its own issue, then changing in both at once.
         */
        it('re-selects the range when inverted, as Ember does', () => {
            const state = run([
                {type: 'selectAll'},
                {type: 'toggle', id: 'c'},
                {type: 'toggle', id: 'd'},
                {type: 'shift', id: 'b', orderedIds: ids}
            ]);

            // c and d were taken out; the backward range from the d anchor is
            // b, c *and* d, and inverted mode puts each of them back — so the
            // shift-click undoes both deselections and everything is selected
            // again.
            expect(selected(state)).toEqual(['a', 'b', 'c', 'd', 'e']);
        });
    });

    describe('selectAll', () => {
        it('inverts rather than enumerating, so unloaded rows are covered', () => {
            const state = run([{type: 'selectAll'}]);

            expect(state.inverted).toBe(true);
            expect(state.selectedIds.size).toBe(0);
            expect(selected(state)).toEqual(ids);
        });

        it('toggles back off when pressed again', () => {
            expect(run([{type: 'selectAll'}, {type: 'selectAll'}]).inverted).toBe(false);
        });

        // Ember discards the ids on select-all, so a row deselected before it
        // doesn't come back as a row deselected after it.
        it('discards the previous selection', () => {
            const state = run([{type: 'toggle', id: 'b'}, {type: 'selectAll'}]);

            expect(selected(state)).toEqual(ids);
            expect(state.lastSelectedId).toBeNull();
        });
    });

    describe('clear', () => {
        it('resets an ordinary selection', () => {
            expect(selected(run([{type: 'toggle', id: 'b'}, {type: 'clear'}]))).toEqual([]);
        });

        it('resets an inverted selection rather than leaving everything selected', () => {
            const state = run([{type: 'selectAll'}, {type: 'clear'}]);

            expect(state.inverted).toBe(false);
            expect(selected(state)).toEqual([]);
        });
    });
});

describe('getPostSelectionCount', () => {
    it('counts the selected rows', () => {
        expect(getPostSelectionCount(run([{type: 'toggle', id: 'b'}]), 100)).toBe(1);
    });

    // Inverted counts against the server's total, not the rows in memory —
    // Cmd+A on a 2,000-post site reads 2,000, not the 30 that are loaded.
    it('counts everything on the server when inverted', () => {
        expect(getPostSelectionCount(run([{type: 'selectAll'}]), 2000)).toBe(2000);
    });

    it('subtracts deselected rows from the total', () => {
        const state = run([{type: 'selectAll'}, {type: 'toggle', id: 'b'}, {type: 'toggle', id: 'c'}]);

        expect(getPostSelectionCount(state, 2000)).toBe(1998);
    });

    // Ember floors this at 1. The total lags behind while pages load, so the
    // subtraction can otherwise go negative and read "-3 posts selected".
    it('never reads below one while inverted', () => {
        const state = run([{type: 'selectAll'}, {type: 'toggle', id: 'a'}, {type: 'toggle', id: 'b'}]);

        expect(getPostSelectionCount(state, 1)).toBe(1);
    });
});

describe('isSinglePostSelected', () => {
    it('is true for exactly one row', () => {
        expect(isSinglePostSelected(run([{type: 'toggle', id: 'b'}]))).toBe(true);
    });

    it('is false for two rows', () => {
        expect(isSinglePostSelected(run([{type: 'toggle', id: 'b'}, {type: 'toggle', id: 'c'}]))).toBe(false);
    });

    // One *deselected* row is not one selected row — this decides whether the
    // context menu offers its single-post actions in Phase 7.
    it('is false when inverted, whatever the id count', () => {
        expect(isSinglePostSelected(run([{type: 'selectAll'}, {type: 'toggle', id: 'b'}]))).toBe(false);
    });
});
