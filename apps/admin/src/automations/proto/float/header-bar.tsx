import React from 'react';
import {Button} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {StatusBadge} from '@/automations/proto/shared/status-badge';

// The screen's header. Two zones on one row: navigation and identity at the left —
// back arrow, the pane toggle where a release has one, then the title and its
// status — and the screen's actions at the right. Only the SURFACE differs by
// release (see `flat`); the arrangement is shared.
//
// A centred "Automations / <name>" breadcrumb has now been tried here twice and
// rejected twice, on the same ground both times: it puts the automation's name at
// the middle of the screen while the control that leaves it sits at the edge, so
// the two halves of "where am I and how do I get out" end up apart. Centring does
// hold the title still while the pane opens and closes behind it — that's the one
// thing it's genuinely better at — but it isn't worth splitting identity from
// navigation, and a crumb that doubles as the way back still reads as a label
// first. If it comes up a third time, this is the objection to answer.
interface HeaderBarProps {
    title: string;
    status: 'active' | 'inactive';
    onBack: () => void;
    // The screen's chrome actions, passed as a node rather than rebuilt here so
    // both header variants raise identical controls — a header style shouldn't
    // change what the screen lets you do.
    actions: React.ReactNode;
    // Drops the bar's own surface and its bottom rule so the header sits directly
    // on the page. Used by the release whose canvas is an inset window: once the
    // canvas is bounded, a bounded header above it makes two competing frames and
    // the eye has to pick which one is the object.
    flat?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    title,
    status,
    onBack,
    actions,
    flat = false
}) => (
    <header className={cn(
        'relative z-30 flex h-16 shrink-0 items-center justify-between px-4',
        // Docked: the header is its own elevated surface, separated from the
        // content below by a rule. Flat: no fill and no rule, so the page
        // background runs straight through it.
        !flat && 'border-b border-border-default bg-surface-elevated'
    )}>
        {/* Identity sits with navigation at the left rather than centred: the title
            is what you came here for, and the way back belongs beside it. min-w-0 so
            a long automation name truncates instead of pushing the actions off. */}
        <Inline align="center" className="min-w-0" gap="sm">
            <Button aria-label="Back to automations" size="icon" type="button" variant="ghost" onClick={onBack}>
                <LucideIcon.ArrowLeft strokeWidth={2} />
            </Button>
            {/* text-lg (15px), matching the shipping automation header's own name
                verbatim. The screen's subject should be the largest thing on it; at
                text-md it was a step BELOW the pane heading beneath it, which inverted
                the hierarchy — the region label outranking the thing it reports on. */}
            <span className="min-w-0 truncate text-lg font-semibold">{title}</span>
            <StatusBadge status={status} />
        </Inline>

        <Inline align="center" className="shrink-0" gap="sm">
            {actions}
        </Inline>
    </header>
);
