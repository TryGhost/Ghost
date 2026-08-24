import React from 'react';
import {Button} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {StatusBadge} from '@/automations/proto/shared/status-badge';

// The docked header for the 'bar' variant of HEADER_SLOT.
//
// Two zones on one row: navigation and identity at the left — back arrow, the
// pane toggle where a release has one, then the title and its status — and the
// screen's actions at the right.
//
// The title was centred behind an "Automations /" breadcrumb for a while. Centring
// kept it still while the pane collapsed, but it also put the automation's name
// nowhere near the control that leaves it, and the crumb duplicated a back arrow
// that had been removed to make room for it.
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
        {/* Identity sits with navigation at the left rather than centred: the title
            is what you came here for, and the way back belongs beside it. min-w-0 so
            a long automation name truncates instead of pushing the actions off. */}
        <Inline align="center" className="min-w-0" gap="sm">
            <Button aria-label="Back to automations" size="icon" type="button" variant="ghost" onClick={onBack}>
                <LucideIcon.ArrowLeft strokeWidth={2} />
            </Button>
            {/* One sidebar-glyph toggle for both states — the same PanelLeft the
                Shade sidebar uses, so it reads as "the left panel" at a glance,
                and a single stable control beats an X that moves into the pane
                and back out. The label carries the state for screen readers. */}
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
                    <LucideIcon.PanelLeft strokeWidth={2} />
                </Button>
            )}
            <span className="min-w-0 truncate text-md font-semibold">{title}</span>
            <StatusBadge status={status} />
        </Inline>

        <Inline align="center" className="shrink-0" gap="sm">
            {actions}
        </Inline>
    </header>
);
