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
        // Sticky-pinned below the search/chip bar (top: --stick-top, measured by
        // useStickyList). bg-sidebar makes rows scroll under it; the border-collapse
        // table means the row's own border-b won't stick, so the bottom divider is
        // drawn as an inset box-shadow instead. z-10 sits under the bar's z-20.
        <TableHead className={cn('sticky top-[var(--stick-top,80px)] z-10 bg-sidebar px-4 shadow-[inset_0_-1px_0_var(--border-default)]', className)}>
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
