import React from 'react';

// Shared node-card shell tokens — one source of truth so surface / radius / elevation /
// padding updates apply to every card state (read step, edit step, terminal pill).
// Border COLOR, interaction, and inner structure stay per-variant.
export const NODE_CARD_SURFACE = 'bg-surface-elevated-2';
export const NODE_CARD_SHELL = `w-[400px] rounded-xl border shadow-sm ${NODE_CARD_SURFACE}`;
export const NODE_CARD_PADDING = 'p-6';

interface StepNodeHeaderProps {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
}

// Icon chip + label, shared by both canvases' step nodes. With a subtitle (read
// canvas) it stacks a muted label over the bold value; without one (edit canvas,
// where the form carries the value) it shows just the action label in that same
// bold style. The chip is a filled 36x36 box (size-4 icon + p-2.5) so it matches
// the size-9 overflow button on the header's far right; muted fill instead of a
// hairline border so it reads as a deliberate container at this size.
export const StepNodeHeader: React.FC<StepNodeHeaderProps> = ({icon: Icon, title, subtitle}) => (
    <div className="flex min-w-0 items-center gap-3">
        <span className="flex shrink-0 items-center justify-center rounded-md bg-muted/40 p-2.5 text-foreground">
            <Icon className="size-4" />
        </span>
        {subtitle ? (
            <div className="flex min-w-0 flex-col">
                <span className="text-xs text-muted-foreground">{title}</span>
                <span className="truncate text-md font-medium">{subtitle}</span>
            </div>
        ) : (
            <span className="min-w-0 truncate text-md font-medium">{title}</span>
        )}
    </div>
);
