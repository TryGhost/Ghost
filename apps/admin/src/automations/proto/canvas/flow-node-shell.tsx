import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@tryghost/shade/utils';
import { HIDDEN_HANDLE_STYLE } from './flow-utils';

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
export type NodeBorder = 'default' | 'selected' | 'current' | 'done' | 'exited' | 'failed';
const NODE_BORDER: Record<NodeBorder, string> = {
  default: 'border-border-default',
  selected: 'border-blue',
  current: 'border-blue',
  done: 'border-green',
  // Where a member left the flow. Grey rather than a colour of its own — exiting
  // isn't a failure to flag, it just isn't a completion, and green here read as
  // "finished" on the one card that says the opposite. But it's the *strong*
  // grey, not the default: the member did reach this step, so the card has to
  // look marked rather than untouched. Default would have made it identical to
  // the steps they never got to.
  exited: 'border-border-strong',
  // The one state that earns a colour of its own. Exiting is an outcome; failing
  // is a fault, and the only card on the canvas a publisher may need to act on —
  // so it's the only one allowed to raise its hand.
  failed: 'border-red',
};

// The card skeleton: shell + border state + the two flow handles. Body content
// (header, fields, preview, stats) is composed by each canvas as children.
export const NodeCard: React.FC<{
  border?: NodeBorder;
  muted?: boolean;
  children: React.ReactNode;
}> = ({ border = 'default', muted = false, children }) => (
  // group/node so controls that only earn their place on hover — the subject's
  // pencil, the performance chevron — can key off the whole card rather than the
  // element they sit next to.
  <div
    className={cn(
      'group/node transition-colors',
      NODE_CARD_SHELL,
      NODE_BORDER[border],
      muted && 'opacity-60',
    )}
  >
    <Handle position={Position.Top} style={HIDDEN_HANDLE_STYLE} type="target" />
    {children}
    <Handle position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} type="source" />
  </div>
);

interface StepNodeHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  // Recolours the chip (fill + foreground). The review canvas tints it with a
  // run state's badge colours; unset, it's the neutral secondary fill.
  chipClassName?: string;
}

// Icon chip + label. With a subtitle it stacks a muted label over the bold value;
// without one it shows just the action label in that same bold style. The chip is a
// filled 36x36 box (size-4 icon + p-2.5) so it matches the size-9 action slot on the
// header's far right; a filled box instead of a hairline border so it reads as a
// deliberate container at this size.
//
// bg-muted (gray-100 light) rather than bg-secondary (gray-200) — secondary read
// as a heavy grey block against the card's white. Dark mode is unaffected: both
// tokens resolve to gray-900 there, so this is a light-mode-only lightening with
// no dark: variant needed. (An earlier note here rejected muted as invisible,
// but that was muted at 40-60% alpha; at full opacity it holds.)
export const StepNodeHeader: React.FC<StepNodeHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  chipClassName,
}) => (
  <div className="flex min-w-0 items-center gap-3">
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md p-2.5',
        chipClassName ?? 'bg-muted text-foreground',
      )}
    >
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
export const NodeHeader: React.FC<
  StepNodeHeaderProps & { action?: React.ReactNode; meta?: React.ReactNode }
> = ({ icon, title, subtitle, chipClassName, action, meta }) => (
  <div className={cn('flex items-center gap-2', NODE_CARD_PADDING)}>
    <div className="min-w-0 flex-1">
      <StepNodeHeader chipClassName={chipClassName} icon={icon} subtitle={subtitle} title={title} />
    </div>
    {/* Plain trailing text (the review canvas's timestamp) — sized by its
            content, unlike the square action slot. */}
    {meta && <span className="shrink-0 text-sm text-muted-foreground">{meta}</span>}
    {action && (
      // h-9 rather than size-9: the slot holds one control on most cards and
      // two on an email (metrics + overflow), so it sizes to its contents
      // while keeping every card's controls on the same baseline.
      <div
        className="nodrag nopan flex h-9 shrink-0 items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {action}
      </div>
    )}
  </div>
);

// Standard padding for a body section under the header (header already owns its top
// padding, so body sections drop theirs).
export const NODE_BODY_PADDING = `${NODE_CARD_PADDING} pt-0`;
