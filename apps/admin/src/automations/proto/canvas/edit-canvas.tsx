import '@xyflow/react/dist/style.css';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { StepPickerType } from '@/automations/components/canvas/step-picker';
import { AutomationCanvasControls } from '@/automations/components/canvas/controls';
import { CANVAS_ZOOM_CONFIG } from '@/automations/components/canvas/use-canvas-viewport';
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  type Node,
  type NodeProps,
  ReactFlow,
  getSmoothStepPath,
} from '@xyflow/react';
import type {
  AutomationDetail,
  AutomationEmailStats,
  InsertActionAnchor,
} from '@tryghost/admin-x-framework/api/automations';
import {
  insertSendEmailAction,
  insertWaitAction,
  removeAction,
  updateSendEmailAction,
  updateWaitAction,
} from '@tryghost/admin-x-framework/api/automations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { OptionPicker, type PickerOption } from '@/automations/proto/shared/option-picker';
import {
  DEFAULT_TRIGGER_CONFIG,
  TRIGGER_PICKER_OPTIONS,
  type TriggerConfig,
  type TriggerType,
  triggerConfigFor,
  triggerIcon,
  triggerLabel,
  triggerSummary,
} from '@/automations/proto/shared/trigger-config';
import {
  CANVAS_HUD_INSET,
  CANVAS_SLOT_FILL,
  EDGE_STROKE,
  type StepKind,
  formatWait,
  orderActions,
  panTranslateExtent,
  stepKindIcon,
  useCenteredColumn,
  useMeasuredColumn,
} from './flow-utils';
import { EmailAnalyticsSheet, type SheetEmail } from './email-analytics-sheet';
import { EmailStatsFooter, EmailStatsInline } from './email-analytics';
import { NODE_BODY_PADDING, NodeCard, NodeHeader } from './flow-node-shell';
import { EmailPreview } from './email-preview';
import { TriggerEmptyState, TriggerFieldsForm } from './trigger-config-form';

// The real editor's StepPicker speaks 'send_email' | 'wait'; the proto's graph
// helpers here take 'email' | 'wait'.
const toInsertKind = (type: StepPickerType): 'email' | 'wait' =>
  type === 'send_email' ? 'email' : 'wait';

// Wait duration <-> {amount, unit} (mirrors the side panel; whole days when even).
const splitWait = (hours: number): { amount: number; unit: 'days' | 'hours' } =>
  hours % 24 === 0 ? { amount: hours / 24, unit: 'days' } : { amount: hours, unit: 'hours' };
const waitToHours = (amount: number, unit: 'days' | 'hours'): number =>
  unit === 'days' ? amount * 24 : amount;

// Dashed circular "insert step" button, matched to the real add-step-edge.
// CANVAS_SLOT_FILL: these read as an empty slot cut out of the canvas, so they
// the canvas's own fill (opaque, so the dot pattern doesn't show through the slot).
// Previously --surface-page, which is pure black in dark mode — darker than the
// canvas it sat on, so the buttons rendered as holes.
const INSERT_BUTTON_CLASSES = `border-dashed border-border-default ${CANVAS_SLOT_FILL} text-text-secondary shadow-sm hover:border-border-strong`;

// The steps you can add, in the shared icon/title/description shape. Same rows
// the trigger picker uses, so "what starts this" and "what happens next" are
// chosen the same way.
const STEP_PICKER_OPTIONS: PickerOption<StepPickerType>[] = [
  { value: 'send_email', icon: LucideIcon.Mail, title: 'Email', description: 'Send an email' },
  {
    value: 'wait',
    icon: LucideIcon.Clock,
    title: 'Wait',
    description: 'Add a delay before the next step',
  },
];

const AddStepPopover: React.FC<{
  children: React.ReactNode;
  onPick: (type: StepPickerType) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ children, onPick, open, onOpenChange }) => (
  <OptionPicker
    align="center"
    open={open}
    options={STEP_PICKER_OPTIONS}
    side="top"
    sideOffset={12}
    onOpenChange={onOpenChange}
    onSelect={onPick}
  >
    {children}
  </OptionPicker>
);

type StepNodeData = {
  kind: StepKind;
  title: string;
  subtitle: string;
  selected: boolean;
  // Email only: opens the right-hand analytics sheet.
  onOpenAnalytics?: () => void;
  // Trigger node. Without onTriggerConfigChange the summary is read-only — the
  // read canvas passes no handler, since it shows what's running rather than
  // what's being edited.
  triggerConfig?: TriggerConfig;
  onTriggerConfigChange?: (next: TriggerConfig) => void;
  // Phase-1 concept: trigger fixed after creation (see float/trigger-card-model).
  triggerLocked?: boolean;
  // Nothing chosen to start this automation yet. Its own flag rather than an
  // absent triggerConfig, because the read canvas also passes no config and means
  // something entirely different by it — "don't offer to edit this", not "this
  // hasn't been answered".
  triggerUnset?: boolean;
  // Which beat of the creation sequence is playing, or undefined for a canvas that
  // isn't playing one. The canvas owns the clock; the node owns its own motion.
  introPhase?: IntroPhase;
  // Asks the canvas to confirm a different trigger. The node doesn't apply it
  // itself: swapping the trigger discards the audience and exits configured under
  // the old one, which is a warning the canvas owns.
  onRequestTriggerChange?: (type: TriggerType) => void;
  // Which action this card is, so the email's link fixtures can be looked up.
  actionId?: string;
  // Future concept: an email's numbers live on the card as bars, with the top
  // links revealed in place, instead of behind the right-hand sheet.
  inlineAnalytics?: boolean;
  linksOpen?: boolean;
  onToggleLinks?: () => void;
  // Always-visible inline edit form (non-trigger nodes).
  subject?: string;
  stats?: AutomationEmailStats;
  waitHours?: number;
  onSubjectChange?: (subject: string) => void;
  onWaitChange?: (hours: number) => void;
  onDelete?: () => void;
  onEditContent?: () => void;
};

// The one-time sequence a brand-new automation plays when its trigger is first
// chosen. Four beats, because the canvas is answering four separate questions and
// running them together reads as a single jumble:
//
//   leaving     the options fade out, the card holding still
//   growing     the fields fade in while the card resizes to hug them
//   connecting  the connector draws downward, then the exit card lands
//   (null)      no animation — an existing automation, or the sequence is over
//
// Deliberately NOT a crossfade with the flow already in place. The connector and
// the exit card can't be positioned until the trigger card has finished resizing —
// their y comes from its measured height — so drawing them early would mean
// re-deriving the line every frame against a card still in motion.
export type IntroPhase = 'leaving' | 'growing' | 'connecting';

// Each beat's own duration lives with the element that animates it; these are when
// the NEXT beat starts, so they trail their animation slightly rather than cutting
// it off.
export const INTRO_LEAVING_MS = 140;
// Ends 40ms BEFORE the card has finished resizing, on purpose. The last stretch of
// a decelerating curve covers almost no distance, and node positions are re-derived
// from the measured height every frame — so the connector starts drawing while the
// card settles its final few pixels, and the exit card tracks it rather than
// waiting for it. Overlapping the beats is most of what stops this reading as slow.
export const INTRO_GROWING_MS = 240;
// The line, and the exit card starting just before the line finishes reaching it.
export const INTRO_CONNECTING_MS = 380;

// One curve for the whole sequence, so a card resizing and a line drawing read as
// the same gesture rather than two things eased differently.
//
// A plain decelerate, not the hard-out curve this started with. That one covered
// most of its distance in the first third and then crept, which is why a 300ms
// grow read as instant-then-settling — the duration was real, but almost none of
// the movement was in it.
const INTRO_EASE = 'ease-[cubic-bezier(0.22,0.61,0.36,1)]';

// The card resizing around its new contents, and the connector drawing itself down
// to the exit card. Both are transitions rather than keyframes — they interpolate
// between two measured values, which is what a transition is for — and both are
// classes rather than inline style, because an inline `transition` outranks the
// motion-reduce utility that has to be able to switch it off.
//
// INTRO_GROWING_MS above has to outlast the grow, since the connector can't be
// positioned until the card it hangs from has stopped moving.
const INTRO_GROW_CLASS = `transition-[height] duration-280 ${INTRO_EASE} motion-reduce:transition-none`;
// Still the quickest beat — the line is a connection being made, not an object
// arriving — but not so quick that the exit card lands before it has got there.
const INTRO_DRAW_CLASS = `transition-[stroke-dashoffset] duration-200 ${INTRO_EASE} motion-reduce:transition-none`;
// The exit card, held back until the line is most of the way down to it — not all
// the way, so the two overlap rather than queue. The delay is an arbitrary property
// rather than `delay-*`, which tw-animate-css redefines to mean animation-delay,
// and this is a transition.
const INTRO_EXIT_CLASS = `transition-[opacity,translate] duration-240 [transition-delay:140ms] ${INTRO_EASE} motion-reduce:transition-none`;

const StepNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as StepNodeData;
  const isTrigger = d.kind === 'trigger';
  const clickable = !isTrigger;
  const isEmail = d.kind === 'email';
  const triggerConfig = d.triggerConfig ?? DEFAULT_TRIGGER_CONFIG;
  const configurable = isTrigger && Boolean(d.onTriggerConfigChange);
  const wait = splitWait(d.waitHours ?? 24);
  const changeWait = (amount: number, unit: 'days' | 'hours') => {
    const hours = waitToHours(amount, unit);
    if (Number.isSafeInteger(hours) && hours > 0) {
      d.onWaitChange?.(hours);
    }
  };
  const triggerLocked = isTrigger && Boolean(d.triggerLocked);
  const triggerUnset = isTrigger && Boolean(d.triggerUnset);
  // Captured at mount: a card that STARTED life asking the question is the one
  // being created, and it's the only one that fades in. Read live, this would also
  // fire on the card returning from a "Change trigger".
  const bornAsking = useRef(triggerUnset).current;
  const [changeTriggerOpen, setChangeTriggerOpen] = useState(false);
  const phase = d.introPhase;
  // Height animation for the card body. `height: auto` doesn't interpolate, so the
  // card can't simply be told to resize — it has to be handed the two numbers. The
  // option list's height is captured while it's still on screen, and the fields'
  // height is measured the moment they render, before the browser paints. Between
  // beats the height is null, meaning auto: nothing here clamps a card that later
  // grows because a tier filter revealed another field.
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);
  const bodyContentRef = useRef<HTMLDivElement>(null);
  const optionsHeight = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (phase === 'leaving') {
      optionsHeight.current = bodyContentRef.current?.offsetHeight ?? null;
      return;
    }
    if (phase !== 'growing') {
      // Back to auto — the transition has finished and the card's own content
      // should decide its height again.
      setBodyHeight(null);
      return;
    }
    const from = optionsHeight.current;
    const to = bodyContentRef.current?.offsetHeight;
    if (from === null || to === undefined) {
      return;
    }
    // Pin to the old height first, then hand over the new one a frame later —
    // a transition needs two rendered values, not one assignment.
    setBodyHeight(from);
    const frame = requestAnimationFrame(() => setBodyHeight(to));
    return () => cancelAnimationFrame(frame);
  }, [phase]);
  // Set by the "Change trigger" item, read once the menu has finished closing.
  const openPickerOnClose = useRef(false);
  // Locked trigger: a lock where other cards put their overflow menu. A button,
  // not a static glyph — clicking it answers "why can't I change this?" in a
  // popover instead of leaving the disabled select to explain itself.
  const lockAction = triggerLocked ? (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button aria-label="Why the trigger is locked" size="icon" variant="ghost">
          <LucideIcon.Lock />
        </Button>
      </PopoverTrigger>
      {/* "always" so the popover tracks its card when the canvas pans — same
                reason as the overflow menu below. */}
      <PopoverContent align="end" className="w-72" updatePositionStrategy="always">
        <p className="text-sm">This trigger is set for now, with more options on the way.</p>
      </PopoverContent>
    </Popover>
  ) : undefined;
  // The trigger's own ⋯, in the slot every other card puts one. Changing the
  // trigger opens the picker as a popover rather than returning the card to its
  // asking state — the card is showing a configured trigger, and reverting it to a
  // list would look like the configuration had been thrown away before you'd
  // agreed to it.
  //
  // The menu closes first and the picker hangs off the ⋯ itself, so the list lands
  // just under the card header where the menu was, rather than cascading off a menu
  // item that's still sitting open behind it.
  const changeTriggerAction =
    isTrigger && !triggerUnset && !triggerLocked && d.onRequestTriggerChange ? (
      <OptionPicker
        align="end"
        open={changeTriggerOpen}
        options={TRIGGER_PICKER_OPTIONS}
        value={triggerConfig.type}
        externalAnchor
        onOpenChange={setChangeTriggerOpen}
        onSelect={(type) => d.onRequestTriggerChange?.(type)}
      >
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            {/* The ⋯ is both the menu's trigger and the picker's anchor, so the
                            list lands under the card header where the menu was. */}
            <PopoverAnchor asChild>
              <Button aria-label="Trigger actions" size="icon" variant="ghost">
                <LucideIcon.MoreHorizontal />
              </Button>
            </PopoverAnchor>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            updatePositionStrategy="always"
            // Radix closes a menu asynchronously and then pulls focus back to the
            // trigger. Opening the picker inside onSelect races both: it can be
            // dismissed by the closing menu, or lose focus a frame later. Waiting
            // for the close, and keeping the focus return from firing, hands the
            // picker an empty stage.
            onCloseAutoFocus={(event) => {
              if (!openPickerOnClose.current) {
                return;
              }
              openPickerOnClose.current = false;
              event.preventDefault();
              setChangeTriggerOpen(true);
            }}
          >
            <DropdownMenuItem onSelect={() => (openPickerOnClose.current = true)}>
              <LucideIcon.Repeat /> Change trigger
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </OptionPicker>
    ) : undefined;
  // Email cards raise their analytics from the header, beside the overflow, so
  // the way in is a control that names itself rather than a hover state buried
  // in the metrics.
  const analyticsAction =
    isEmail && d.stats && !d.inlineAnalytics ? (
      <Button
        aria-label="View email analytics"
        size="icon"
        type="button"
        variant="ghost"
        onClick={d.onOpenAnalytics}
      >
        <LucideIcon.ChartNoAxesColumn />
      </Button>
    ) : null;
  // Header action slot: overflow menu for editable steps. The trigger has no
  // action unless locked — its fields are in the card.
  // The trigger's slot holds the lock when it's fixed, the ⋯ when it isn't.
  const triggerAction = lockAction ?? changeTriggerAction;
  const overflowAction = clickable ? (
    // modal={false} — the default wraps the menu in RemoveScroll and kills
    // outside pointer events, which freezes the canvas underneath it. The
    // menu is a small aside on one card, not something worth trapping the
    // whole surface for; the picker is non-modal for the same reason, and so
    // is the screen's own ⋯ menu.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Step actions" size="icon" variant="ghost">
          <LucideIcon.MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      {/* "always" so the menu tracks its card when the canvas pans — see the
                OptionPicker for the full why. */}
      <DropdownMenuContent align="end" updatePositionStrategy="always">
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => d.onDelete?.()}
        >
          <LucideIcon.Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    triggerAction
  );
  const action =
    analyticsAction || overflowAction ? (
      <>
        {analyticsAction}
        {overflowAction}
      </>
    ) : undefined;
  // The trigger wears its own icon once chosen, and none at all before — while the
  // card is still asking the question the options below carry their own icons, and
  // a generic bolt above them was a fourth icon introducing three.
  const headerIcon = triggerUnset
    ? undefined
    : isTrigger
      ? triggerIcon(triggerConfig)
      : stepKindIcon[d.kind];

  return (
    <NodeCard
      border={d.selected ? 'selected' : 'default'}
      className={cn(
        bornAsking &&
          `animate-in duration-300 ${INTRO_EASE} fade-in-0 slide-in-from-top-2 motion-reduce:animate-none`,
      )}
    >
      <NodeHeader action={action} icon={headerIcon} title={d.title} />
      {isTrigger && (
        // The trigger's own fields sit in the card, like every other step's
        // form — nothing about the trigger is behind a popover any more.
        // nodrag/nopan + stopPropagation so using them doesn't pan the canvas.
        //
        // Two elements rather than one: the outer holds the animated height and
        // clips what overflows it mid-resize, the inner carries the padding so
        // measuring it gives the height the card actually wants.
        <div
          className={cn(
            'nodrag nopan cursor-default',
            bodyHeight !== null && `overflow-hidden ${INTRO_GROW_CLASS}`,
          )}
          style={bodyHeight === null ? undefined : { height: bodyHeight }}
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={bodyContentRef} className={NODE_BODY_PADDING}>
            {triggerUnset && d.onTriggerConfigChange ? (
              // Fades out in place, the card holding its size, so the options leave
              // before anything replaces them rather than dissolving into the fields.
              <div
                className={cn(
                  phase === 'leaving' &&
                    'animate-out duration-140 ease-in fade-out-0 fill-mode-forwards motion-reduce:animate-none',
                )}
              >
                <TriggerEmptyState onSelect={d.onTriggerConfigChange} />
              </div>
            ) : configurable && d.onTriggerConfigChange ? (
              // Fades in over the list it replaces, alongside the card resizing
              // around it. Without this the configured fields blink into place where
              // the options were.
              //
              // The same recipe the shipping canvas uses for a newly inserted node
              // (components/canvas/nodes) — including motion-reduce, since this is
              // decoration and nobody needs it to understand what happened.
              <div
                className={`animate-in duration-280 ${INTRO_EASE} fade-in-0 motion-reduce:animate-none`}
              >
                <TriggerFieldsForm
                  config={triggerConfig}
                  locked={triggerLocked}
                  onChange={d.onTriggerConfigChange}
                />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{triggerSummary(triggerConfig)}</div>
            )}
          </div>
        </div>
      )}
      {clickable && (
        // Always-visible inline edit form. nodrag/nopan + stopPropagation so typing
        // and selecting don't pan the canvas or re-fire node selection.
        <div
          className={cn('nodrag nopan cursor-default', NODE_BODY_PADDING)}
          onClick={(e) => e.stopPropagation()}
        >
          {isEmail ? (
            // Shared email preview (editable: inline subject + floating edit button),
            // with metrics below.
            <div>
              <EmailPreview
                bare={d.inlineAnalytics}
                subject={d.subject ?? ''}
                editable
                onEditContent={d.onEditContent}
                onSubjectChange={d.onSubjectChange}
              />
              {/* Read-only now. Making the whole summary the button
                                    put the affordance somewhere nothing announced it —
                                    a hover state on a block of numbers isn't
                                    discoverable. Opening analytics is a labelled
                                    control in the header instead. */}
              {d.stats &&
                (d.inlineAnalytics ? (
                  <EmailStatsInline
                    actionId={d.actionId ?? ''}
                    linksOpen={Boolean(d.linksOpen)}
                    stats={d.stats}
                    onToggleLinks={() => d.onToggleLinks?.()}
                  />
                ) : (
                  <div className="mt-3">
                    <EmailStatsFooter divider={false} stats={d.stats} />
                  </div>
                ))}
            </div>
          ) : (
            // No field label — the node header ("Wait") already names this. Both
            // controls sit at h-9 (36px, the base Input default) so they match the
            // subject input; the Select is nudged up from its --control-height default.
            <div className="flex gap-2">
              <Input
                className="h-9 flex-1"
                min={1}
                type="number"
                value={wait.amount}
                onChange={(e) => changeWait(Math.max(1, Number(e.target.value) || 1), wait.unit)}
              />
              <Select
                value={wait.unit}
                onValueChange={(value) => changeWait(wait.amount, value as 'days' | 'hours')}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                {/* Same as the menu above: track the card while
                                        the canvas moves. */}
                <SelectContent updatePositionStrategy="always">
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </NodeCard>
  );
};

// Where the flow ends, as a card like every other card — icon chip, title, and
// nothing else, because there is nothing to configure about ending.
//
// The column used to finish on a dashed "add step" button, which left the flow
// looking unterminated: a reader could see where it started and every step it
// took, but the last thing on the canvas was an invitation rather than an
// outcome, so "what happens after the last email?" had no answer on screen.
//
// Making it a NODE rather than a terminal pill is what fixes the interaction as
// well as the picture. Adding a step now happens the same way everywhere — on the
// connector between two cards — instead of being one gesture between steps and a
// different one at the end. The tail button was the only place in the flow where
// adding meant pressing a big dashed rectangle, and it was also the only place
// you could not insert BEFORE the thing you were pointing at.
const ExitNode: React.FC<NodeProps> = ({ data }) => {
  // Lands after the connector has drawn down to it, so the line arrives somewhere
  // rather than the two appearing together and the line explaining nothing.
  //
  // A transition off a flipped state rather than an `animate-in` on mount, for the
  // same reason the edge waits: React Flow mounts a node before it has measured it,
  // and a keyframe animation starts its clock there — on a card the canvas is still
  // holding hidden. A transition doesn't start until we say so.
  const intro = useRef(Boolean((data as { intro?: boolean } | undefined)?.intro)).current;
  const [shown, setShown] = useState(!intro);
  useEffect(() => {
    if (shown) {
      return;
    }
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [shown]);
  return (
    <NodeCard
      className={cn(intro && INTRO_EXIT_CLASS, intro && !shown && 'translate-y-2 opacity-0')}
    >
      <NodeHeader icon={LucideIcon.LogOut} title="Exit automation" />
    </NodeCard>
  );
};

const nodeTypes = { step: StepNode, exit: ExitNode };

type PlusEdgeData = { onPick: (type: StepPickerType) => void; intro?: boolean };

// Connecting line with a hover-revealed circular "+" at its midpoint, matched to
// the real add-step-edge: the button fades in while the cursor is near the edge
// (or the picker is open) and opens the shared OptionPicker.
const PlusEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const [open, setOpen] = useState(false);
  const [edgeHovered, setEdgeHovered] = useState(false);
  const [labelHovered, setLabelHovered] = useState(false);
  const onPick = (data as PlusEdgeData | undefined)?.onPick;

  // Drawing the line from the trigger card downward. A dash the length of the whole
  // path, offset out of sight and then slid back in — the standard SVG stroke trick,
  // and the only part that needs the path's length.
  //
  // Which is known without measuring the DOM: the column is a single x, so a
  // connector is a straight vertical drop. Summing both axes is exact for that and a
  // slight overestimate for anything with a rounded corner, which only means the
  // line finishes a few milliseconds early.
  const drawLength = Math.abs(targetY - sourceY) + Math.abs(targetX - sourceX);
  // Captured at mount: the flag goes false when the sequence ends, and re-reading
  // it then would undraw a line that's already there.
  const introDraw = useRef(Boolean((data as PlusEdgeData | undefined)?.intro)).current;
  const [drawn, setDrawn] = useState(!introDraw);
  // Wait for a real length before starting. React Flow renders an edge before its
  // endpoints have been measured, so the first frame or two arrive with the
  // coordinates all at zero — and a dash animation over a zero-length path
  // completes instantly. Flipping on the first frame regardless meant the draw was
  // always already over by the time the line had somewhere to go.
  useEffect(() => {
    if (drawn || drawLength === 0) {
      return;
    }
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [drawn, drawLength]);
  const stroke: React.CSSProperties = {
    stroke: EDGE_STROKE,
    strokeWidth: 1,
    ...(introDraw && {
      strokeDasharray: drawLength,
      strokeDashoffset: drawn ? 0 : drawLength,
    }),
  };
  const strokeClass = introDraw ? INTRO_DRAW_CLASS : undefined;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  if (!onPick) {
    return <BaseEdge className={strokeClass} id={id} path={path} style={stroke} />;
  }

  // No "+" until the line it hangs on exists.
  const visible = drawn && (open || edgeHovered || labelHovered);
  return (
    <g onMouseEnter={() => setEdgeHovered(true)} onMouseLeave={() => setEdgeHovered(false)}>
      <BaseEdge className={strokeClass} id={id} interactionWidth={30} path={path} style={stroke} />
      <EdgeLabelRenderer>
        <div
          className="pointer-events-auto absolute"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          onMouseEnter={() => setLabelHovered(true)}
          onMouseLeave={() => setLabelHovered(false)}
        >
          {/* Wider hit zone so the + reveals when the cursor is near the edge midpoint. */}
          <div className="flex h-10 w-16 items-center justify-center">
            <AddStepPopover open={open} onOpenChange={setOpen} onPick={onPick}>
              <button
                aria-label="Insert step here"
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border transition-opacity focus-visible:opacity-100 focus-visible:outline-none',
                  INSERT_BUTTON_CLASSES,
                  visible ? 'opacity-100' : 'opacity-0',
                )}
                type="button"
              >
                <LucideIcon.Plus className="size-5" strokeWidth={1.5} />
              </button>
            </AddStepPopover>
          </div>
        </div>
      </EdgeLabelRenderer>
    </g>
  );
};

const edgeTypes = { plus: PlusEdge };

interface EditCanvasProps {
  draft: AutomationDetail;
  onChange: (next: AutomationDetail) => void;
  // Trigger config lives with the screen (it isn't part of AutomationDetail yet).
  // Without a change handler the trigger renders as a read-only summary.
  //
  // `null` is a created automation with nothing chosen yet: the canvas collapses
  // to the trigger card alone until it's answered.
  triggerConfig?: TriggerConfig | null;
  onTriggerConfigChange?: (next: TriggerConfig) => void;
  triggerLocked?: boolean;
  inlineAnalytics?: boolean;
}

export const EditCanvas: React.FC<EditCanvasProps> = ({
  draft,
  onChange,
  triggerConfig,
  onTriggerConfigChange,
  triggerLocked = false,
  inlineAnalytics = false,
}) => {
  const { canvasRef, onInit, size } = useCenteredColumn();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Which email the right-hand analytics sheet is reporting on.
  const [analyticsActionId, setAnalyticsActionId] = useState<string | null>(null);
  // Which email has its top-links list open. Held here rather than in the node so
  // the layout can account for the height it adds — node y-positions are derived
  // from measured heights, and a card that grows without the canvas knowing would
  // overlap the one below it.
  const [linksOpenId, setLinksOpenId] = useState<string | null>(null);
  // Email-content dialog, opened from a card's inline "Edit email content" button.
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  // A trigger picked from the node's ⋯, waiting on the warning below. Swapping the
  // trigger throws away the audience and exits configured under the old one, so the
  // pick is held here rather than applied where it was made.
  const [pendingTriggerType, setPendingTriggerType] = useState<TriggerType | null>(null);

  // No trigger chosen yet — a created automation, before its first decision.
  // `triggerConfig === undefined` is the read canvas passing none and means the
  // opposite, so the check is explicitly against null.
  const unset = triggerConfig === null;

  // The creation sequence, run once, when a canvas that had no trigger gets one.
  // Not on "Change trigger" — the flow below is already built, and animating it away
  // and back would say something was rebuilt that wasn't — and not on load.
  const [introPhase, setIntroPhase] = useState<IntroPhase | null>(null);
  // Adjusted during render, not from an effect, and tracked in STATE rather than a
  // ref. Both halves of that matter:
  //
  // An effect runs after the browser paints, so there would be one painted frame
  // where the trigger is set but the sequence hasn't started — the whole flow at
  // full height, for a frame. React discards a render that sets its own state this
  // way and re-runs it before anything reaches the screen.
  //
  // And StrictMode invokes render twice, discarding the first pass. A ref mutated
  // in that first pass survives the discard while the setState beside it does not,
  // so the second pass sees "already handled" and starts nothing — the sequence
  // never ran in dev, which is the only place it was being looked at. State is
  // rolled back with the discarded render, so both passes reach the same
  // conclusion. This is why React's own "adjust state on prop change" pattern uses
  // state for the previous value.
  const [prevUnset, setPrevUnset] = useState(unset);
  if (prevUnset !== unset) {
    setPrevUnset(unset);
    setIntroPhase(unset ? null : 'leaving');
  }
  // Each beat schedules only the one after it, so the sequence is a chain rather
  // than three timers set at once — which would need the cleanup to know which of
  // them had already fired.
  useEffect(() => {
    if (introPhase === null) {
      return;
    }
    const next: Record<IntroPhase, IntroPhase | null> = {
      leaving: 'growing',
      growing: 'connecting',
      connecting: null,
    };
    const after: Record<IntroPhase, number> = {
      leaving: INTRO_LEAVING_MS,
      growing: INTRO_GROWING_MS,
      connecting: INTRO_CONNECTING_MS,
    };
    const timer = setTimeout(() => setIntroPhase(next[introPhase]), after[introPhase]);
    return () => clearTimeout(timer);
  }, [introPhase]);

  // The card still asking its question: either nothing is chosen, or something just
  // was and the options haven't finished leaving.
  const showOptions = unset || introPhase === 'leaving';
  // The trigger card alone on the canvas. Holds through the resize as well, because
  // everything below it is positioned from its height.
  const triggerOnly = showOptions || introPhase === 'growing';

  const ordered = orderActions(draft);

  // Card heights are read back from the render, so nothing here has to know what
  // a card contains — see useMeasuredColumn.
  const { onNodesChange, layout } = useMeasuredColumn();

  const insert = (anchor: InsertActionAnchor, kind: 'email' | 'wait') => {
    onChange(
      kind === 'email'
        ? insertSendEmailAction({ detail: draft, anchor })
        : insertWaitAction({ detail: draft, anchor }),
    );
  };
  // The email the analytics sheet is reporting on, resolved from the live draft
  // so edits to its subject show through while the sheet is open.
  const analyticsAction = ordered.find((a) => a.id === analyticsActionId);
  const sheetEmail: SheetEmail | null =
    analyticsAction?.type === 'send_email' && analyticsAction.stats
      ? {
          actionId: analyticsAction.id,
          subject: analyticsAction.data.email_subject || 'Untitled',
          stats: analyticsAction.stats,
        }
      : null;

  // Re-picking the trigger it already has is a no-op, not a warning about
  // discarding settings it isn't going to discard.
  const requestTriggerChange = useCallback(
    (type: TriggerType) => {
      if (triggerConfig && triggerConfig.type !== type) {
        setPendingTriggerType(type);
      }
    },
    [triggerConfig],
  );

  const { nodes, edges, contentBottom } = useMemo(() => {
    // The column, top to bottom: trigger, each action in flow order, then the
    // tail button. Order is the only thing the layout needs — heights come back
    // measured, so an email card growing an analytics block or a links list
    // moves the cards below it without anything here being told.
    const { ys, bottom } = layout(
      triggerOnly
        ? ['__trigger__']
        : ['__trigger__', ...ordered.map((action) => action.id), '__exit__'],
    );

    const built: Node[] = [];
    built.push({
      id: '__trigger__',
      type: 'step',
      position: { x: 0, y: ys[0] },
      data: {
        kind: 'trigger',
        // Named by what it is once it's chosen, the way the read canvas already
        // titles it and the way every step card names its own subject. Before that
        // the header is the question the card is asking, since the body is the list
        // of answers.
        title: showOptions || !triggerConfig ? 'Select a trigger' : triggerLabel(triggerConfig),
        subtitle: '',
        selected: false,
        triggerConfig: triggerConfig ?? undefined,
        onTriggerConfigChange,
        triggerLocked,
        triggerUnset: showOptions,
        introPhase: introPhase ?? undefined,
        onRequestTriggerChange: requestTriggerChange,
      },
      draggable: false,
      connectable: false,
      selectable: false,
    });
    // Nothing else to draw yet: the trigger node is either asking the question, or
    // resizing around the answer with nothing below it to displace.
    if (triggerOnly) {
      return { nodes: built, edges: [] as Edge[], contentBottom: bottom };
    }
    ordered.forEach((action, i) => {
      const isEmail = action.type === 'send_email';
      built.push({
        id: action.id,
        type: 'step',
        position: { x: 0, y: ys[i + 1] },
        data: {
          kind: isEmail ? 'email' : 'wait',
          title: isEmail ? 'Send email' : 'Wait',
          subtitle: isEmail
            ? action.data.email_subject || 'Untitled'
            : formatWait(action.data.wait_hours),
          // Also blue while its analytics sheet is open, so the sheet is
          // visibly tied to the card it's reporting on.
          selected: action.id === selectedId || action.id === analyticsActionId,
          // Inline-form values + per-node handlers (each edits its own action).
          subject: action.type === 'send_email' ? action.data.email_subject : undefined,
          stats: action.type === 'send_email' ? action.stats : undefined,
          waitHours: action.type === 'wait' ? action.data.wait_hours : undefined,
          onSubjectChange: (subject: string) =>
            onChange(
              updateSendEmailAction({
                detail: draft,
                actionId: action.id,
                emailSubject: subject,
                emailLexical: action.type === 'send_email' ? action.data.email_lexical : '',
              }),
            ),
          onWaitChange: (hours: number) =>
            onChange(updateWaitAction({ detail: draft, actionId: action.id, waitHours: hours })),
          onDelete: () => {
            onChange(removeAction({ detail: draft, actionId: action.id }));
            setSelectedId(null);
          },
          onEditContent: () => setEmailDialogOpen(true),
          onOpenAnalytics: () => setAnalyticsActionId(action.id),
          actionId: action.id,
          inlineAnalytics,
          linksOpen: linksOpenId === action.id,
          onToggleLinks: () => setLinksOpenId(linksOpenId === action.id ? null : action.id),
        },
        draggable: false,
        connectable: false,
        selectable: false,
      });
    });
    built.push({
      id: '__exit__',
      type: 'exit',
      position: { x: 0, y: ys[ys.length - 1] },
      data: { intro: introPhase === 'connecting' },
      draggable: false,
      connectable: false,
      selectable: false,
    });

    const ids = built.map((n) => n.id);
    const builtEdges: Edge[] = [];
    for (let i = 0; i < ids.length - 1; i++) {
      const source = ids[i];
      const target = ids[i + 1];
      // Every connector carries a +, the one into Exit included — that edge is
      // what replaced the tail button, and it appends rather than inserting
      // before anything, since Exit is not an action to sit in front of.
      const toExit = target === '__exit__';
      builtEdges.push({
        id: `${source}->${target}`,
        source,
        target,
        type: 'plus',
        data: {
          onPick: (type: StepPickerType) =>
            insert(
              {
                previousActionId: source === '__trigger__' ? undefined : source,
                nextActionId: toExit ? undefined : target,
              },
              toInsertKind(type),
            ),
          // Only the first automation's first connector draws itself. A step
          // inserted later gets its edge the way it always did.
          intro: introPhase === 'connecting',
        },
      });
    }
    return { nodes: built, edges: builtEdges, contentBottom: bottom };
  }, [
    draft,
    ordered,
    selectedId,
    analyticsActionId,
    triggerConfig,
    onTriggerConfigChange,
    triggerLocked,
    inlineAnalytics,
    linksOpenId,
    layout,
    showOptions,
    triggerOnly,
    introPhase,
    requestTriggerChange,
  ]);

  const translateExtent = useMemo(
    () => panTranslateExtent(contentBottom, size),
    [contentBottom, size],
  );

  return (
    // relative: the analytics sheet slides in over this region.
    <div className="relative flex size-full">
      <div ref={canvasRef} className="min-h-0 flex-1">
        <ReactFlow
          edges={edges}
          edgeTypes={edgeTypes}
          maxZoom={CANVAS_ZOOM_CONFIG.maxZoom}
          minZoom={CANVAS_ZOOM_CONFIG.minZoom}
          nodes={nodes}
          nodesConnectable={false}
          nodesDraggable={false}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          translateExtent={translateExtent}
          zoomOnScroll={false}
          panOnDrag
          panOnScroll
          onInit={onInit}
          onNodeClick={(_, node) => {
            if (node.type !== 'step') {
              return;
            }
            // The trigger's fields live in its card and its exitCriteria row opens
            // the popover, so a bare card click does nothing.
            if (node.id === '__trigger__') {
              return;
            }
            setSelectedId(node.id);
          }}
          onNodesChange={onNodesChange}
          // Doesn't dismiss the analytics sheet — that's a deliberate read,
          // closed from its own control or Escape.
          onPaneClick={() => setSelectedId(null)}
        >
          <Background variant={BackgroundVariant.Dots} />
          {/* The shipping canvas's own controls, imported rather than
                        rebuilt: zoom out / zoom level menu / zoom in, docked
                        bottom-left of the flow. It reads the viewport off
                        useReactFlow, so it only needs to be inside ReactFlow —
                        and it disables its buttons against CANVAS_ZOOM_CONFIG,
                        which is why the bounds above come from there too rather
                        than staying hardcoded to the same numbers. */}
          <AutomationCanvasControls style={CANVAS_HUD_INSET} />
        </ReactFlow>
      </div>

      <EmailAnalyticsSheet email={sheetEmail} onClose={() => setAnalyticsActionId(null)} />

      {/* Picking a different trigger from the node's ⋯ resets the audience and
                exits underneath it, which is worth saying out loud before it happens. */}
      <AlertDialog
        open={pendingTriggerType !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingTriggerType(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change trigger?</AlertDialogTitle>
            <AlertDialogDescription>
              The audience and exit conditions you’ve set for this trigger will be reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTriggerType) {
                  onTriggerConfigChange?.(triggerConfigFor(pendingTriggerType));
                }
                setPendingTriggerType(null);
              }}
            >
              Change trigger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email content editing is out of scope for the prototype — opened from a
                card's inline "Edit email content" button. */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email content</DialogTitle>
            <DialogDescription>
              The full email editor isn’t wired up in this prototype — this is where the Koenig
              content editor would open to design the email.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditCanvas;
