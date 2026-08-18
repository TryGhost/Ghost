import React from 'react';
import {cn} from '@tryghost/shade/utils';

// Run-state glyphs shared by the places that report one: the left pane's runs
// table and its count cards, and the canvas when a member's run is in focus.
//
// Shared rather than defined next to the table, because a member looking at
// their own progress shouldn't have to learn the mark twice — the icon on the
// step they're waiting at is the icon beside their name in the list.
//
// Custom rather than Lucide, and drawn as a set: all three are built on the same
// 6px-radius circle at the same 1.5 stroke, so they read as one family and the
// difference between them is only what happens to that circle. Lucide's
// equivalents are individually fine but don't line up with each other — the
// checks and arrows sit at different weights and optical sizes, which is exactly
// what makes a column of statuses look noisy.
//
// currentColor throughout, so each takes the colour of whatever is reporting the
// status and flips with the theme.

// In progress: a dashed track with a solid arc over it — the circle part-drawn.
// Deliberately static; nothing in a run tells us how far through a wait a member
// is, so a ring filled to a percentage would be inventing precision.
export const InProgressGlyph: React.FC<{className?: string}> = ({className}) => (
    <svg className={cn('size-4 shrink-0', className)} fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeDasharray="1 3" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);

// Completed: the circle left open at the same angle in-progress's arc starts
// from, with a check drawn over the gap — reading as that ring having come back
// around and closed itself into the checkmark, rather than a checkmark added to
// an already-closed circle.
export const CompletedGlyph: React.FC<{className?: string}> = ({className}) => (
    <svg className={cn('size-4 shrink-0', className)} fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.4546 2.52342C9.7053 2.18709 8.8745 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.2438 14 13.8863 11.4259 13.9964 8.20897" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M13 4.5L8.1 9.3996L6 7.24577" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
);

// Exited early: the circle broken open on the right, with an arrow leaving
// through the gap.
export const ExitedGlyph: React.FC<{className?: string}> = ({className}) => (
    <svg className={cn('size-4 shrink-0', className)} fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M7 8H14M11 11L14 8L11 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
);
