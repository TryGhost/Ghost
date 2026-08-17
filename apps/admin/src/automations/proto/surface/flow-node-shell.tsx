import React from 'react';
import {Handle, Position} from '@xyflow/react';
import {cn} from '@tryghost/shade/utils';

// Shared node-card shell tokens — one source of truth so surface / radius / elevation /
// padding updates apply to every card state (read step, edit step, terminal pill).
//
// --surface-elevated, not -2: a card sits one step above the canvas, which is what
// that token is for. -2 is reserved for menus that open ON TOP of an elevated
// surface, and cards were sitting on it — so a popover opened from a card was the
// identical fill, and the two levels could never be tuned apart.
export const NODE_CARD_SURFACE = 'bg-surface-elevated';
export const NODE_CARD_SHELL = `w-[400px] rounded-xl border shadow-sm ${NODE_CARD_SURFACE}`;
export const NODE_CARD_PADDING = 'p-6';

// Card border/emphasis per state, shared by both canvases so selection (edit) and
// run state (read) stay visually consistent.
export type NodeBorder = 'default' | 'selected' | 'current' | 'done';
const NODE_BORDER: Record<NodeBorder, string> = {
    default: 'border-border-default',
    selected: 'border-blue',
    current: 'border-blue',
    done: 'border-green'
};

// The card skeleton: shell + border state + the two flow handles. Body content
// (header, fields, preview, stats) is composed by each canvas as children.
export const NodeCard: React.FC<{border?: NodeBorder; muted?: boolean; children: React.ReactNode}> = ({border = 'default', muted = false, children}) => (
    <div className={cn('transition-colors', NODE_CARD_SHELL, NODE_BORDER[border], muted && 'opacity-60')}>
        <Handle position={Position.Top} style={{opacity: 0}} type="target" />
        {children}
        <Handle position={Position.Bottom} style={{opacity: 0}} type="source" />
    </div>
);

interface StepNodeHeaderProps {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
}

// Icon chip + label. With a subtitle it stacks a muted label over the bold value;
// without one it shows just the action label in that same bold style. The chip is a
// filled 36x36 box (size-4 icon + p-2.5) so it matches the size-9 action slot on the
// header's far right; muted fill instead of a hairline border so it reads as a
// deliberate container at this size.
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

// Header row: the icon chip + label on the left, and a fixed 36px action slot on the
// right. Both canvases fill the slot identically — edit passes overflow / lock / edit
// controls, read passes the run-state icon (Check/Clock) — so they align by
// construction. The slot is nodrag/nopan and swallows clicks so acting on it never
// pans the canvas or re-fires node selection.
export const NodeHeader: React.FC<StepNodeHeaderProps & {action?: React.ReactNode}> = ({icon, title, subtitle, action}) => (
    <div className={cn('flex items-center gap-2', NODE_CARD_PADDING)}>
        <div className="min-w-0 flex-1">
            <StepNodeHeader icon={icon} subtitle={subtitle} title={title} />
        </div>
        {action && (
            <div className="nodrag nopan flex size-9 shrink-0 items-center justify-center" onClick={e => e.stopPropagation()}>
                {action}
            </div>
        )}
    </div>
);

// Standard padding for a body section under the header (header already owns its top
// padding, so body sections drop theirs).
export const NODE_BODY_PADDING = `${NODE_CARD_PADDING} pt-0`;
