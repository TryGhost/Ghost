import React from 'react';
import {Button} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {StatusBadge} from '@/automations/proto/shared/status-badge';

// The docked header for the 'bar' variant of HEADER_SLOT.
//
// Three zones on one row: navigation left, identity centre, action right. The
// title is centred rather than left-aligned because the left zone is a pair of
// icon buttons whose width doesn't change — so a centred title stays put as the
// pane collapses, where a left-aligned one would shift with its neighbours.
//
// Absolutely-positioned centre, not a three-column grid: the title has to be
// centred on the *screen*, not on the space left between two zones of unequal
// width, or it drifts as the right side gains and loses the unpublished-changes
// button.
interface HeaderBarProps {
    title: string;
    status: 'active' | 'inactive';
    onBack: () => void;
    // Toggles the Performance pane; absent when the editing model can't hide it.
    onTogglePane?: () => void;
    paneCollapsed?: boolean;
    // The screen's chrome actions, passed as a node rather than rebuilt here so
    // both header variants raise identical controls — a header style shouldn't
    // change what the screen lets you do.
    actions: React.ReactNode;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    title,
    status,
    onBack,
    onTogglePane,
    paneCollapsed = false,
    actions
}) => (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-border-default bg-surface-elevated px-4">
        <Inline align="center" gap="none">
            <Button aria-label="Back to automations" size="icon" type="button" variant="ghost" onClick={onBack}>
                <LucideIcon.ArrowLeft strokeWidth={2} />
            </Button>
            {/* One chart-glyph toggle for both states, beside the back arrow — it
                names what it summons (the Performance pane), and a single stable
                control beats an X that moves into the pane and back out. The
                label carries the state for screen readers. */}
            {onTogglePane && (
                <Button
                    aria-label={paneCollapsed ? 'Show performance' : 'Hide performance'}
                    aria-pressed={!paneCollapsed}
                    // Filled while the pane is open — the same bg-muted the rail
                    // buttons use for their active flyouts — so the button reads as
                    // a toggle that's currently on, not just a repeat-action.
                    className={cn(!paneCollapsed && 'bg-muted')}
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={onTogglePane}
                >
                    <LucideIcon.ChartNoAxesColumn strokeWidth={2} />
                </Button>
            )}
        </Inline>

        {/* pointer-events-none so the centred block never swallows a click aimed at
            the zones behind it; the badge and title aren't interactive here. */}
        <Inline align="center" className="pointer-events-none absolute inset-x-0 justify-center" gap="sm">
            <span className="max-w-[40vw] truncate text-md font-semibold">{title}</span>
            <StatusBadge status={status} />
        </Inline>

        <Inline align="center" gap="sm">
            {actions}
        </Inline>
    </header>
);
