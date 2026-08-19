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
// circle at the same 1.5 stroke, so they read as one family and the difference
// between them is only what happens to that circle. The circle sits at r=6.75 —
// nearly the full 16px box — so the set holds the same optical size as the
// Lucide icons beside it (an earlier r=6 cut read a step smaller than
// everything else).
//
// currentColor throughout, so each takes the colour of whatever is reporting the
// status and flips with the theme.

// In progress: a dashed track with a solid arc over it — the circle part-drawn.
// Deliberately static; nothing in a run tells us how far through a wait a member
// is, so a ring filled to a percentage would be inventing precision.
export const InProgressGlyph: React.FC<{className?: string}> = ({className}) => (
    <svg className={cn('size-4 shrink-0', className)} fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeDasharray="1.12 3.38" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M8 14.75C11.7279 14.75 14.75 11.7279 14.75 8C14.75 4.27208 11.7279 1.25 8 1.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);

// Completed: the circle left open at the same angle in-progress's arc starts
// from, with a check drawn over the gap — reading as that ring having come back
// around and closed itself into the checkmark, rather than a checkmark added to
// an already-closed circle.
export const CompletedGlyph: React.FC<{className?: string}> = ({className}) => (
    <svg className={cn('size-4 shrink-0', className)} fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.7624 1.83512C9.91921 1.45663 8.98428 1.24609 8.00018 1.24609C4.27115 1.24609 1.24817 4.26907 1.24817 7.9981C1.24817 11.7271 4.27115 14.7501 8.00018 14.7501C11.6505 14.7501 14.6243 11.8534 14.7482 8.23327" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M13.6269 4.0625L8.11272 9.57619L5.74951 7.15241" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
);

// Exited early: the circle broken open on the right, with an arrow leaving
// through the gap.
export const ExitedGlyph: React.FC<{className?: string}> = ({className}) => (
    <svg className={cn('size-4 shrink-0', className)} fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 14.75C4.27208 14.75 1.25 11.7279 1.25 8C1.25 4.27208 4.27208 1.25 8 1.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M7.4375 8H14.75M11.375 11.375L14.75 8L11.375 4.625" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
);
