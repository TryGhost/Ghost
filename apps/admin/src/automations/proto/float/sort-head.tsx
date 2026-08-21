import React from 'react';
import {TableHead, TableHeadButton} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';

// Sortable column header for the left pane's member table, shared by the panel
// variants. Reuses Shade's TableHeadButton (the same primitive the analytics
// tables sort with), overriding its uppercase/right-aligned defaults back to this
// list's plain left-aligned muted header style. Only the active column shows a
// direction arrow, to keep the header quiet.

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
    key: K;
    direction: SortDirection;
}

interface SortHeadProps<K extends string> {
    label: string;
    sortKey: K;
    sort: SortState<K>;
    onSort: (key: K) => void;
    /** Sets the (fixed) column width — with table-fixed that governs the column. */
    className?: string;
}

export function SortHead<K extends string>({label, sortKey, sort, onSort, className}: SortHeadProps<K>): React.ReactElement {
    const active = sort.key === sortKey;
    return (
        // Not sticky — only the chip bar pins; the column headers scroll away with
        // their table (they used to pin beneath the bar, which stacked two rows of
        // chrome over the list). The bottom rule stays an inset box-shadow from the
        // sticky era: it doubles as the header's single divider now that the row's
        // own borders are off (see the border-b-0 notes at the call sites).
        <TableHead className={cn('px-4 shadow-[inset_0_-1px_0_var(--border-default)]', className)}>
            <TableHeadButton
                className="font-medium text-muted-foreground normal-case"
                // type="button" is required: Shade's Button sets no default type, so
                // this renders a native submit button. The React admin mounts inside
                // the Ember shell's forms, so a submit here fires an ancestor form and
                // scroll jumps to the top on every sort.
                type="button"
                onClick={() => onSort(sortKey)}
            >
                {label}
                {active && (sort.direction === 'asc' ? <LucideIcon.ArrowUp /> : <LucideIcon.ArrowDown />)}
            </TableHeadButton>
        </TableHead>
    );
}
