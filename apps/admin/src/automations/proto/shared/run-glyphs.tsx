import React from 'react';
import {cn} from '@tryghost/shade/utils';

// Run-state glyphs shared by the places that report one: the left pane's runs
// table and its count cards, and the canvas when a member's run is in focus.
//
// Shared rather than defined next to the table, because a member looking at
// their own progress shouldn't have to learn the mark twice — the icon on the
// step they're waiting at is the icon beside their name in the list.

// In progress: a dashed track with a solid arc over it. Deliberately static —
// an earlier version filled a ring to a percentage, but nothing in a run tells
// us how far through a wait a member actually is, so the number was invented.
// A fixed mark says "in progress" without implying precision we don't have.
//
// currentColor throughout, so it takes the colour of whatever is reporting the
// status and flips with the theme.
export const InProgressGlyph: React.FC<{className?: string}> = ({className}) => (
    <svg className={cn('size-4 shrink-0', className)} fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeDasharray="1 3" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);
