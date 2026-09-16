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
  Handle,
  type Node,
  type NodeProps,
  Position,
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
  Switch,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { OptionPicker, type PickerOption } from '@/automations/proto/shared/option-picker';
import { PROTO_EASE } from '@/automations/proto/shared/motion';
import {
  DEFAULT_TRIGGER_CONFIG,
  SIMPLE_TRIGGER_OPTIONS,
  TRIGGER_PICKER_OPTIONS,
  type TriggerConfig,
  type TriggerType,
  hasTiers,
  triggerConfigFor,
  triggerIcon,
  triggerLabel,
  triggerSummary,
} from '@/automations/proto/shared/trigger-config';
import {
  CANVAS_HUD_INSET,
  HIDDEN_HANDLE_STYLE,
  CANVAS_SLOT_FILL,
  EDGE_STROKE,
  NODE_VISUAL_GAP,
  type StepKind,
  formatWait,
  lexicalHasContent,
  orderActions,
  panTranslateExtent,
  stepKindIcon,
  useCenteredColumn,
  useMeasuredColumn,
} from './flow-utils';
import { EmailAnalyticsSheet, type SheetEmail } from './email-analytics-sheet';
import { EmailStatsFooter } from './email-analytics';
import { NODE_BODY_PADDING, NODE_CARD_FRAME, NodeCard, NodeHeader } from './flow-node-shell';
import { EmailPreview } from './email-preview';
import { EMPTY_LEXICAL, SEEDED_LEXICAL } from '@/automations/proto/shared/mock';
import { TriggerEmptyState, TriggerFieldsForm } from './trigger-config-form';

// The trigger's node id — also its name in the grace system (graceStepId),
// since choosing or configuring a trigger makes it the card being worked on
// exactly the way inserting a step does.
const TRIGGER_NODE_ID = '__trigger__';

// What an email that hasn't sent yet has done: nothing, counted. Every email
// card reports, from the moment it exists — a brand-new node included — so the
// stats block is part of what an email IS here, not a reward for having run.
// This stands in wherever there's no fixture (mock run data only covers the
// seeded automations).
//
// Sent 0, rates null — which the proto's formatRate renders as an em dash
// (see its note for why that glyph).
// All-zeros was tried for looking cleaner and reverted: the two rates are
// PERCENTAGES, and 0% claims a measurement ("everyone we sent to ignored it")
// where the truth is that there's nothing to measure yet. A count can honestly
// be zero; a rate over nobody can only decline to answer.
const ZERO_EMAIL_STATS: AutomationEmailStats = {
  email_sent_count: 0,
  email_opened_count: 0,
  email_clicked_count: 0,
  opened_rate: null,
  clicked_rate: null,
};

// The real editor's StepPicker speaks 'send_email' | 'wait'; the proto's graph
// helpers here take 'email' | 'wait'.
const toInsertKind = (type: StepPickerType): 'email' | 'wait' =>
  type === 'send_email' ? 'email' : 'wait';

// Wait duration <-> {amount, unit} (mirrors the side panel; whole days when even).
//
// Hours and days only. Minutes were tried and backed out: wait_hours is the
// schema's unit and the framework's updateWaitAction gates on whole hours, so a
// minutes option means either loosening shipping validation for a proto or a
// proto-local write bypassing it — neither worth it for an option that isn't in
// scope. If minutes become real, the schema's unit is the thing to revisit.
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

// A problem standing between this card and the automation running, worn by the
// card itself: a warning outline, and a gold alert button in the header slot that
// opens a popover saying what to do about it.
//
// This used to be a Banner centred in the screen's header. The header is where
// Publish lives, which argued for it — but the card is where the CAUSE lives, and
// a reader scanning the flow for what's wrong was given a message at the top of
// the screen about a card they hadn't found yet. Every canvas tool surveyed puts
// the fault on the node that owns it, and the popover means the explanation
// arrives where the eye already is.
//
// The message states the fix, not the failure — "Connect Stripe to…" rather than
// "Stripe is not connected". Just the sentence: a first cut carried a resolution
// button too, and it came out — the fix lives in Settings, and a button that
// deep an action deserves the journey rather than a shortcut inside a popover.
export interface NodeWarning {
  message: string;
}

type StepNodeData = {
  kind: StepKind;
  title: string;
  subtitle: string;
  selected: boolean;
  // See NodeWarning. The trigger wears one for a missing Stripe connection, and
  // an email wears one for a blank subject — nothing here is shaped to either, so
  // whatever card next has a fault takes the same treatment.
  warning?: NodeWarning;
  // Email only: whether this card's analytics sheet is open, and the toggle
  // that opens or closes it — one handler, because the button is a toggle and
  // splitting open/close across two would let them disagree.
  analyticsOpen?: boolean;
  onToggleAnalytics?: () => void;
  // Trigger node. Without onTriggerConfigChange the summary is read-only — the
  // read canvas passes no handler, since it shows what's running rather than
  // what's being edited.
  triggerConfig?: TriggerConfig;
  onTriggerConfigChange?: (next: TriggerConfig) => void;
  // Phase-1 concept: trigger fixed after creation (see float/trigger-card-model).
  triggerLocked?: boolean;
  // Phase 1 names its triggers more plainly and drops their descriptions — see
  // SIMPLE_TRIGGER_OPTIONS. Off everywhere else.
  simpleTriggerNames?: boolean;
  // Nothing chosen to start this automation yet. Its own flag rather than an
  // absent triggerConfig, because the read canvas also passes no config and means
  // something entirely different by it — "don't offer to edit this", not "this
  // hasn't been answered".
  triggerUnset?: boolean;
  // Which beat of the creation sequence is playing, or undefined for a canvas that
  // isn't playing one. The canvas owns the clock; the node owns its own motion.
  introPhase?: IntroPhase;
  // This card's place in the canvas's entrance, in ms. Undefined once the entrance
  // is over, so inserting a step later doesn't replay it.
  enterDelay?: number;
  // Just added by the step picker. Cleared shortly after, so the card doesn't
  // animate again the next time anything re-renders it.
  isNew?: boolean;
  // Asks the canvas to confirm a different trigger. The node doesn't apply it
  // itself: swapping the trigger discards the settings and exits configured under
  // the old one, which is a warning the canvas owns.
  onRequestTriggerChange?: (type: TriggerType) => void;
  // Always-visible inline edit form (non-trigger nodes).
  subject?: string;
  // Whether the email has anything written yet — a new one hasn't, and its body
  // preview shows an empty state instead of standing in content that isn't there.
  emailHasContent?: boolean;
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
//
// The canvas itself never moves during any of it. A closing beat that re-centred
// the finished flow was tried twice — once straight after the resize, once at the
// very end — and both were worse than nothing: the card someone had just chosen a
// trigger in, and was already reaching back into, would slide out from under the
// cursor. Auto-centring earns its place when a step is ADDED, where the flow has
// grown somewhere the reader hasn't looked yet; here they are looking right at it.
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
export const INTRO_LEAVING_MS = 120;
// Ends 40ms BEFORE the card has finished resizing, on purpose. The last stretch of
// a decelerating curve covers almost no distance, and node positions are re-derived
// from the measured height every frame — so the connector starts drawing while the
// card settles its final few pixels, and the exit card tracks it rather than
// waiting for it. Overlapping the beats is most of what stops this reading as slow.
export const INTRO_GROWING_MS = 260;
// The line, and the exit card starting just before the line finishes reaching it.
export const INTRO_CONNECTING_MS = 300;

// The proto's one easing curve — see shared/motion.
const INTRO_EASE = PROTO_EASE;

// The canvas arriving on a screen that already existed — opening an automation from
// the list, rather than creating one. Each card follows the one above it.
const ENTER_STAGGER_MS = 70;

// A step arriving on a canvas that's already there. Verbatim from the shipping
// canvas (components/canvas/nodes) — engineers reading both should find one answer,
// not two, and that one is already reviewed.
const NEW_STEP_CLASS =
  'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none';
const NEW_STEP_MS = 400;
// Bringing a newly added card to the middle of the canvas, after the column has
// settled around it. Doing both at once would be the card moving while it appears,
// which is two things to follow.
const STEP_CENTER_MS = 450;
// Below this the canvas doesn't bother: a card that already sits near the middle
// doesn't need correcting by a few pixels, and a move that small reads as the canvas
// slipping rather than as anything being done.
const STEP_CENTER_MIN_SHIFT = 24;

// The column opening to make room for an insertion, and closing up after a delete.
//
// React Flow positions nodes with an inline transform, and a CSS transition tweens
// an inline style like any other — so the cards below an insertion glide instead of
// jumping. The same rule covers deleting a step and a card growing (an email's links
// list, a tier filter revealing a field), both of which also jumped.
//
// Only safe because nothing here is draggable. On a canvas with draggable nodes this
// would put every card 300ms behind the cursor, which is why it isn't the default.
//
// Written as String.raw, and with the curve spelled out rather than interpolated
// from PROTO_EASE, because Tailwind reads class names out of the source text and
// both would otherwise be lost: an underscore means a space inside an arbitrary
// variant, so `react-flow__node` needs its underscores escaped and the backslashes
// have to survive into the runtime string; and a `${...}` is not a name the scanner
// can see. Keep the curve in step with shared/motion.
const NODE_SETTLE_CLASS = String.raw`[&_.react-flow\_\_node]:transition-transform [&_.react-flow\_\_node]:duration-300 [&_.react-flow\_\_node]:ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:[&_.react-flow\_\_node]:transition-none`;
const ENTER_CLASS = `animate-in duration-320 ${INTRO_EASE} fade-in-0 fill-mode-backwards slide-in-from-bottom-2 motion-reduce:animate-none`;

// The card resizing around its new contents, and the connector drawing itself down
// to the exit card. Both are transitions rather than keyframes — they interpolate
// between two measured values, which is what a transition is for — and both are
// classes rather than inline style, because an inline `transition` outranks the
// motion-reduce utility that has to be able to switch it off.
//
// INTRO_GROWING_MS above has to outlast the grow, since the connector can't be
// positioned until the card it hangs from has stopped moving.
const INTRO_GROW_CLASS = `transition-[height] duration-240 ${INTRO_EASE} motion-reduce:transition-none`;
// Still the quickest beat — the line is a connection being made, not an object
// arriving — but not so quick that the exit card lands before it has got there.
const INTRO_DRAW_CLASS = `transition-[stroke-dashoffset] duration-180 ${INTRO_EASE} motion-reduce:transition-none`;
// The exit card, held back until the line is most of the way down to it — not all
// the way, so the two overlap rather than queue. The delay is an arbitrary property
// rather than `delay-*`, which tw-animate-css redefines to mean animation-delay,
// and this is a transition.
const INTRO_EXIT_CLASS = `transition-[opacity,translate] duration-180 [transition-delay:120ms] ${INTRO_EASE} motion-reduce:transition-none`;

const StepNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as StepNodeData;
  const isTrigger = d.kind === 'trigger';
  // A step (wait / email), as opposed to the trigger. Was `clickable`, back when
  // clicking a step selected it — the blue border with no follow-up. Selection is
  // gone (see the ReactFlow props below); every card's controls are on the card.
  const isAction = !isTrigger;
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
  // What's in the box while it's being typed in, which is not always a number a
  // wait can be made of.
  //
  // Bound straight to the value, the field was uneditable: clearing it made an
  // empty string, an empty string isn't a valid duration, so the change was
  // rejected and the old digit reappeared under the cursor. You could never get to
  // an empty box to type a different number into.
  //
  // So the text is held here while it's being edited and only committed when it
  // parses. Leaving it empty isn't a wait of zero — a step that waits no time is a
  // step that shouldn't be there — so blurring an empty box puts the previous value
  // back rather than inventing one.
  const [waitText, setWaitText] = useState<string | null>(null);
  // A step you just added opens with its cursor in it. The two kinds of card ask for
  // different first things — a subject, a duration — but in both the answer is the
  // first field, so this finds it rather than each card knowing its own name for it.
  // (The email's subject lives inside EmailPreview, which would otherwise need a prop
  // threaded through it for this alone.)
  //
  // preventScroll because the canvas is about to centre this card itself: left to
  // the browser, focus would scroll the container first and the two would fight.
  const formRef = useRef<HTMLDivElement>(null);
  const focusOnMount = useRef(Boolean(d.isNew)).current;
  useEffect(() => {
    if (!focusOnMount) {
      return;
    }
    // Next frame, not this one: the card mounts while the picker that added it is
    // still closing, and focus set mid-teardown is focus something else is about to
    // take back.
    const frame = requestAnimationFrame(() => {
      formRef.current?.querySelector('input')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusOnMount]);
  const triggerLocked = isTrigger && Boolean(d.triggerLocked);
  const triggerUnset = isTrigger && Boolean(d.triggerUnset);
  // A configured trigger with nothing to say renders header-only — no body, no
  // second block of padding under the first. Locked (phase 1's saved state) has
  // no fields and, simple, no exit sentence; unlocked-but-simple has fields only
  // when the paid trigger discloses tiers. Everywhere else the exit sentence
  // keeps the body occupied.
  const triggerBodyEmpty =
    isTrigger &&
    !triggerUnset &&
    (triggerLocked || (Boolean(d.simpleTriggerNames) && !hasTiers(triggerConfig)));
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
  // A locked trigger (phase 1) carries NO control in the slot. It carried a lock
  // for a while — a button whose popover answered "why can't I change this?" —
  // and the lock earned its place when the card below it held disabled fields
  // that looked like they should work. Phase 1's triggers have no fields at all
  // now, so there's nothing on the card that invites an edit, and a lock was
  // announcing a restriction nobody had run into. The absent ⋯ is the whole
  // message.
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
        options={d.simpleTriggerNames ? SIMPLE_TRIGGER_OPTIONS : TRIGGER_PICKER_OPTIONS}
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
  // The card's warning, in the header slot ahead of the ⋯ — the same position the
  // email card gives its analytics button, so a second control beside the overflow
  // is already a shape this header has. A button rather than a static glyph, for
  // the same reason the lock is one: the icon raises the question and clicking it
  // should be the answer.
  const warningAction = d.warning ? (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button aria-label="Why this step needs attention" size="icon" variant="ghost">
          <LucideIcon.TriangleAlert className="text-state-warning" />
        </Button>
      </PopoverTrigger>
      {/* "always" so the popover tracks its card when the canvas pans — same
                as every other surface raised from a card. */}
      <PopoverContent align="end" className="w-72" updatePositionStrategy="always">
        <p className="text-md">{d.warning.message}</p>
      </PopoverContent>
    </Popover>
  ) : undefined;
  // Email cards raise their analytics from the header, beside the overflow, so
  // the way in is a control that names itself rather than a hover state buried
  // in the metrics.
  // A toggle, not a launcher: pressed while its sheet is open, and pressing it
  // again closes the sheet. The pressed fill is the same bg-muted every other
  // open-state control in the proto takes (the lane switcher, an open menu's
  // trigger), so "this button's panel is open" reads the same everywhere.
  const analyticsAction =
    isEmail && d.stats ? (
      <Button
        aria-label={d.analyticsOpen ? 'Hide email analytics' : 'View email analytics'}
        aria-pressed={d.analyticsOpen}
        className={cn(d.analyticsOpen && 'bg-muted')}
        // The sheet dismisses itself on any pointerdown outside its own panel,
        // and this button is outside it — so pressing the armed toggle closed
        // the sheet on pointerdown and the click then re-opened it. The sheet's
        // dismiss listener skips this attribute: the toggle owns its presses.
        size="icon"
        type="button"
        variant="ghost"
        data-email-analytics-toggle
        onClick={d.onToggleAnalytics}
      >
        <LucideIcon.ChartNoAxesColumn />
      </Button>
    ) : null;
  // Header action slot: overflow menu for editable steps. The trigger's slot
  // holds the ⋯ when it can be changed, and nothing when it's fixed — see the
  // note on the retired lock above.
  const triggerAction = changeTriggerAction;
  const overflowAction = isAction ? (
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
    warningAction || analyticsAction || overflowAction ? (
      <>
        {warningAction}
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
      // Warning outranks selection: a fault the automation can't run with is
      // worth more than where the cursor happens to be.
      border={d.warning ? 'warning' : d.selected ? 'selected' : 'default'}
      className={cn(
        // The entrance and an insertion never overlap in practice — one is the
        // canvas arriving, the other needs it to already be there — but they're
        // exclusive so they can't both drive the animation if they ever do.
        d.enterDelay !== undefined ? ENTER_CLASS : d.isNew && NEW_STEP_CLASS,
        bornAsking &&
          `animate-in duration-300 ${INTRO_EASE} fade-in-0 slide-in-from-top-2 motion-reduce:animate-none`,
      )}
      style={d.enterDelay === undefined ? undefined : { animationDelay: `${d.enterDelay}ms` }}
    >
      <NodeHeader action={action} icon={headerIcon} title={d.title} />
      {isTrigger &&
        !triggerBodyEmpty && (
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
                      'animate-out duration-120 ease-in fade-out-0 fill-mode-forwards motion-reduce:animate-none',
                  )}
                >
                  <TriggerEmptyState
                    simpleNames={d.simpleTriggerNames}
                    onSelect={d.onTriggerConfigChange}
                  />
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
                  className={`animate-in duration-240 ${INTRO_EASE} fade-in-0 motion-reduce:animate-none`}
                >
                  <TriggerFieldsForm
                    config={triggerConfig}
                    // Phase 1's triggers stay simple: the exit sentence belongs to
                    // the general-model lanes, where exits are part of what's being
                    // explored. Phase 1 shows what ships, and production has no
                    // exit configuration to speak of.
                    showExits={!d.simpleTriggerNames}
                    onChange={d.onTriggerConfigChange}
                  />
                </div>
              ) : (
                // text-control — the same size every trigger caption takes,
                // matched to the email card's body excerpt.
                <div className="text-control text-muted-foreground">
                  {triggerSummary(triggerConfig)}
                </div>
              )}
            </div>
          </div>
        )}
      {isAction && (
        // Always-visible inline edit form. nodrag/nopan + stopPropagation so typing
        // and selecting don't pan the canvas or re-fire node selection.
        <div
          ref={formRef}
          className={cn('nodrag nopan cursor-default', NODE_BODY_PADDING)}
          onClick={(e) => e.stopPropagation()}
        >
          {isEmail ? (
            // Shared email preview (editable: inline subject + floating edit button),
            // with metrics below.
            <div>
              <EmailPreview
                hasContent={d.emailHasContent}
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
              {d.stats && (
                <div className="mt-3">
                  <EmailStatsFooter divider={false} stats={d.stats} />
                </div>
              )}
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
                value={waitText ?? wait.amount}
                onBlur={() => setWaitText(null)}
                onChange={(e) => {
                  setWaitText(e.target.value);
                  const amount = Number(e.target.value);
                  if (e.target.value !== '' && Number.isSafeInteger(amount) && amount > 0) {
                    changeWait(amount, wait.unit);
                  }
                }}
                // Clicking in replaces rather than appends. These are one or two
                // digits that get changed wholesale — nobody edits their way from 3
                // to 14 — and a number input's spinner makes the caret hard to place
                // by hand anyway.
                onFocus={(e) => e.target.select()}
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
  const enterDelay = (data as { enterDelay?: number } | undefined)?.enterDelay;
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
    // The same material as every other card — elevated surface, border, shadow, the
    // cards' own padding — at a different SIZE and a quieter weight.
    //
    // It was a full NodeCard: 400px wide with a 36px icon chip, identical to an email
    // step, so at a glance the flow read as ending in one more thing the automation
    // does. It isn't; it's the end of the line, and the only node here you can't act
    // on. Hugging its content says that by being visibly smaller than everything above
    // it, and the muted foreground says it again — this card reports rather than
    // offers.
    //
    // Not a pill on --muted, which was the other thing tried. That made it part of the
    // canvas rather than an object on it, and lost the one property it should keep:
    // it's still a node in the flow, and the connector still lands on it.
    //
    // The 400px wrapper stays, and the card centres inside it. Nodes sit at x: 0 and
    // the VIEWPORT is centred against NODE_WIDTH (see flow-utils), so a narrower node
    // would hang off the column's left edge rather than centring under it.
    //
    // The read canvas keeps a full-width card here — see flow-canvas. With a member in
    // focus that node reports their outcome and takes a run border and chip like every
    // other card, so it has to be able to look like one.
    <div
      className={cn(
        'flex w-[400px] justify-center',
        enterDelay !== undefined && ENTER_CLASS,
        intro && INTRO_EXIT_CLASS,
        intro && !shown && 'translate-y-2 opacity-0',
      )}
      style={enterDelay === undefined ? undefined : { animationDelay: `${enterDelay}ms` }}
    >
      <Handle position={Position.Top} style={HIDDEN_HANDLE_STYLE} type="target" />
      <div
        className={cn(
          NODE_CARD_FRAME,
          'border-border-default',
          // p-4 (16px), against the cards' own p-6. Their padding is sized to hold a
          // 36px icon chip and a stack of fields; around one line of text that made a
          // box mostly full of air, reading as a card waiting for content rather than
          // one that has all it needs. 16 keeps the family resemblance while letting
          // the height say what the width already does — 12 took it far enough from
          // the others to read as a different kind of thing.
          'inline-flex items-center gap-3 p-4',
          'text-muted-foreground',
        )}
      >
        <LucideIcon.LogOut className="size-4 shrink-0" strokeWidth={2} />
        <span className="text-md font-medium">Exit automation</span>
      </div>
    </div>
  );
};

const nodeTypes = { step: StepNode, exit: ExitNode };

type PlusEdgeData = {
  onPick: (type: StepPickerType) => void;
  intro?: boolean;
  // Skip the hover reveal and keep the + on screen — see alwaysShowInserts.
  alwaysVisible?: boolean;
};

// Connecting line with a circular "+" at its midpoint, matched to the real
// add-step-edge. While the automation is being BUILT the + stays on screen;
// once it's running, it reveals on hover (cursor near the edge, or the picker
// open) the way the shipping canvas does — see alwaysShowInserts for why.
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
  const alwaysVisible = Boolean((data as PlusEdgeData | undefined)?.alwaysVisible);

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
  const visible = drawn && (alwaysVisible || open || edgeHovered || labelHovered);
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
  // The screen's verdict on the trigger — see NodeWarning. The canvas just
  // wears it; whether Stripe is connected is the screen's business.
  triggerWarning?: NodeWarning;
  triggerLocked?: boolean;
  // Phase 1's plainer trigger names, with no descriptions — see
  // SIMPLE_TRIGGER_OPTIONS. Off everywhere else.
  simpleTriggerNames?: boolean;
  // Bumped by the screen when a blocked publish should make the canvas show its
  // whole hand — every warning, grace periods included. A counter rather than a
  // boolean so consecutive blocked presses each land; the canvas never resets it.
  revealWarningsSignal?: number;
  // Keep every connector's + on screen instead of revealing on hover. The
  // screen passes this while the automation is OFF: building is when adding
  // steps is the point, and hover-only inserts made the moment after choosing
  // a trigger read as a dead end — one card, one line, and no visible way to
  // continue. Running, the flow is something being watched rather than built,
  // so the inserts fall back to hover the way the shipping canvas does.
  alwaysShowInserts?: boolean;
}

export const EditCanvas: React.FC<EditCanvasProps> = ({
  draft,
  onChange,
  triggerConfig,
  onTriggerConfigChange,
  triggerWarning,
  triggerLocked = false,
  simpleTriggerNames = false,
  revealWarningsSignal,
  alwaysShowInserts = false,
}) => {
  const { canvasRef, onInit, size, centerOn, contentHeightRef, recenter } = useCenteredColumn();
  // Which email the right-hand analytics sheet is reporting on.
  const [analyticsActionId, setAnalyticsActionId] = useState<string | null>(null);
  // Email-content dialog, opened from a card's inline "Edit email content" button.
  // Keyed by the action that opened it, because the dialog can now WRITE — its
  // simulate toggle fills or empties that email's lexical, so it has to know
  // whose lexical that is.
  const [emailDialogActionId, setEmailDialogActionId] = useState<string | null>(null);
  // The step just inserted, held only as long as its entrance takes. Left set, the
  // card would animate again on any later re-render.
  const [newStepId, setNewStepId] = useState<string | null>(null);
  // Which card the canvas should bring to the middle next. Set when a step is added
  // and at no other time.
  //
  // Deleting deliberately doesn't move the canvas. Running the add in reverse —-
  // centring the card above the gap — was tried and taken out again: it assumes the
  // reader is working back up the flow, and someone clearing out several steps in a
  // row is usually working DOWN it. Guessing wrong there takes the view away from
  // the next thing they were about to delete.
  const [centerStepId, setCenterStepId] = useState<string | null>(null);
  useEffect(() => {
    if (!newStepId) {
      return;
    }
    const timer = setTimeout(() => setNewStepId(null), NEW_STEP_MS);
    return () => clearTimeout(timer);
  }, [newStepId]);
  // A trigger picked from the node's ⋯, waiting on the warning below. Swapping the
  // trigger throws away the settings and exits configured under the old one, so the
  // pick is held here rather than applied where it was made.
  const [pendingTriggerType, setPendingTriggerType] = useState<TriggerType | null>(null);
  // The one card allowed to be blank without being told off: the step most
  // recently added, while the user is still plausibly working on it.
  //
  // A new email is born with nothing in it, and outlining it gold in the same
  // breath as creating it would be scolding someone for not having finished a
  // sentence they just started. So the card gets a grace period, and what ends it
  // is ATTENTION MOVING — any canvas action that isn't about this card: editing
  // another step, adding or deleting one, changing the trigger. Not time, which
  // would fire mid-thought, and not blur, which the canvas doesn't really have.
  //
  // Inserting another step passes the grace to it, which is the same rule from the
  // other side: the old card stopped being the thing being worked on the moment a
  // newer one existed.
  const [graceStepId, setGraceStepId] = useState<string | null>(null);
  // An action about `actionId` keeps the grace; one about anything else ends it.
  // A functional update, because these calls live inside node-data handlers built
  // under useMemo and would otherwise close over a stale value.
  const settleOthers = (actionId: string) =>
    setGraceStepId((current) => (current !== null && current !== actionId ? null : current));
  // The screen asked for full disclosure — a blocked publish. Grace is a
  // display nicety and validation already ignores it (the screen validates the
  // draft directly); this makes the DISPLAY catch up, so the popover's "fix all
  // issues" has every issue visibly on a card. Skipped on mount: the signal
  // starts at whatever the screen initialised, and only a change means a press.
  const firstSignal = useRef(revealWarningsSignal);
  useEffect(() => {
    if (revealWarningsSignal !== firstSignal.current) {
      setGraceStepId(null);
    }
  }, [revealWarningsSignal]);

  // No trigger chosen yet — a created automation, before its first decision.
  // `triggerConfig === undefined` is the read canvas passing none and means the
  // opposite, so the check is explicitly against null.
  const unset = triggerConfig === null;

  // The canvas is blank until React Flow has centred the column, then its cards
  // arrive in order.
  //
  // React Flow centres the flow from a measurement it can only take once the DOM
  // exists, so the first painted frame has the nodes positioned for a viewport that
  // hasn't accounted for the performance pane beside it — they draw wide and jump
  // left. Waiting a frame and fading in means the first thing drawn is the right
  // thing, and staggering the cards turns the wait into the screen assembling
  // itself rather than a pause.
  //
  // Not for a canvas being created: that one has the trigger sequence, and two
  // entrances for one screen is one too many. Captured at mount because `unset`
  // stops being true the moment a trigger is picked.
  const [entered, setEntered] = useState(false);
  const [entranceOver, setEntranceOver] = useState(false);
  const staggerOnEntry = useRef(!unset).current;
  useEffect(() => {
    if (entered || size.width === 0) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      // Re-anchor before revealing. React Flow's own init runs before any card has
      // been measured, so the flow's height wasn't known yet and it anchored to the
      // top by default; by now it is, and this is the last moment the correction is
      // free — the canvas is still being held at opacity 0.
      recenter();
      setEntered(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [entered, size.width, recenter]);
  // Dropped once it has played. Left in place, a card's delay would change as steps
  // were inserted around it, and a changed animation class replays the animation —
  // so adding one step would re-introduce the whole flow.
  useEffect(() => {
    if (!entered || entranceOver) {
      return;
    }
    const timer = setTimeout(() => setEntranceOver(true), 1200);
    return () => clearTimeout(timer);
  }, [entered, entranceOver]);
  const staggering = staggerOnEntry && entered && !entranceOver;
  const enterDelay = (index: number) => (staggering ? index * ENTER_STAGGER_MS : undefined);

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
    const next =
      kind === 'email'
        ? insertSendEmailAction({ detail: draft, anchor })
        : insertWaitAction({ detail: draft, anchor });
    // Which action is the new one, read off the result rather than returned by the
    // helpers — they hand back a whole detail, and its id is the one thing here that
    // needs to know which card just appeared.
    const before = new Set(draft.actions.map((action) => action.id));
    const added = next.actions.find((action) => !before.has(action.id))?.id ?? null;
    setNewStepId(added);
    setCenterStepId(added);
    // The new card is the one being worked on now — see graceStepId. This both
    // grants the newcomer its grace and ends the previous holder's.
    setGraceStepId(added);
    onChange(next);
  };
  // The email the analytics sheet is reporting on, resolved from the live draft
  // so edits to its subject show through while the sheet is open.
  const analyticsAction = ordered.find((a) => a.id === analyticsActionId);
  // Same live resolution for the content dialog: its switch reads the email's
  // current lexical back off the draft, so the toggle can't drift from the data.
  const dialogAction = ordered.find((a) => a.id === emailDialogActionId);
  const dialogEmail = dialogAction?.type === 'send_email' ? dialogAction : undefined;
  // Same zero fallback as the cards' footers: the sheet opens from a button the
  // zeros put on screen, so it has to be able to report the same nothing.
  const sheetEmail: SheetEmail | null =
    analyticsAction?.type === 'send_email'
      ? {
          actionId: analyticsAction.id,
          subject: analyticsAction.data.email_subject || 'Untitled',
          stats: analyticsAction.stats ?? ZERO_EMAIL_STATS,
        }
      : null;

  // The trigger config changing is an action about the TRIGGER, so the grace
  // moves there — which ends any step's grace (attention demonstrably moved)
  // and grants the trigger its own. The trigger earns a grace period for the
  // same reason a new email does: a just-picked paid trigger starts with no
  // tiers chosen, and outlining it gold in the same breath as choosing it
  // would be scolding someone mid-thought. Editing the tiers routes through
  // here too, which correctly KEEPS the trigger's grace — an action about the
  // card being worked on.
  const changeTriggerConfig = useCallback(
    (next: TriggerConfig) => {
      setGraceStepId(TRIGGER_NODE_ID);
      onTriggerConfigChange?.(next);
    },
    [onTriggerConfigChange],
  );

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

  const { nodes, edges, contentBottom, centerStepY } = useMemo(() => {
    // The column, top to bottom: trigger, each action in flow order, then the
    // tail button. Order is the only thing the layout needs — heights come back
    // measured, so an email card growing an analytics block or a links list
    // moves the cards below it without anything here being told.
    const columnIds = triggerOnly
      ? [TRIGGER_NODE_ID]
      : [TRIGGER_NODE_ID, ...ordered.map((action) => action.id), '__exit__'];
    const { ys, bottom } = layout(columnIds);

    // The middle of whichever card the canvas has been asked to centre on. Heights
    // aren't handed back by the layout, but they're implied by it: the next card's
    // top, less the constant gap, is this one's bottom — and for the last card that
    // bottom is the content's.
    const centerIndex = centerStepId ? columnIds.indexOf(centerStepId) : -1;
    let targetCenter: number | null = null;
    if (centerIndex >= 0) {
      const top = ys[centerIndex];
      const nextTop = ys[centerIndex + 1];
      const cardBottom = nextTop === undefined ? bottom : nextTop - NODE_VISUAL_GAP;
      targetCenter = top + (cardBottom - top) / 2;
    }

    const built: Node[] = [];
    built.push({
      id: TRIGGER_NODE_ID,
      type: 'step',
      position: { x: 0, y: ys[0] },
      data: {
        kind: 'trigger',
        // Named by what it is once it's chosen, the way the read canvas already
        // titles it and the way every step card names its own subject. Before that
        // the header is the question the card is asking, since the body is the list
        // of answers.
        title:
          showOptions || !triggerConfig
            ? 'Select a trigger'
            : triggerLabel(triggerConfig, simpleTriggerNames),
        subtitle: '',
        selected: false,
        triggerConfig: triggerConfig ?? undefined,
        // Wrapped so a config change ends any step's grace; undefined still has
        // to mean read-only, so the wrap doesn't paper over an absent handler.
        onTriggerConfigChange: onTriggerConfigChange ? changeTriggerConfig : undefined,
        // Not while the card is still asking its question — an unanswered
        // trigger can't be at fault yet, and the options list shouldn't open
        // gold. Two possible faults, one at a time: the screen's (Stripe — a
        // site-level prerequisite, so it goes first) over the canvas's own
        // (tiers unanswered, grace-gated like the emails' blank warning; the
        // screen validates the same fact separately, so grace never lets it
        // publish).
        warning: showOptions
          ? undefined
          : (triggerWarning ??
            (triggerConfig &&
            hasTiers(triggerConfig) &&
            triggerConfig.tierIds.length === 0 &&
            graceStepId !== TRIGGER_NODE_ID
              ? { message: 'Choose tiers before this automation can be published.' }
              : undefined)),
        triggerLocked,
        simpleTriggerNames,
        triggerUnset: showOptions,
        introPhase: introPhase ?? undefined,
        enterDelay: enterDelay(0),
        onRequestTriggerChange: requestTriggerChange,
      },
      draggable: false,
      connectable: false,
      selectable: false,
    });
    // Nothing else to draw yet: the trigger node is either asking the question, or
    // resizing around the answer with nothing below it to displace.
    if (triggerOnly) {
      return {
        nodes: built,
        edges: [] as Edge[],
        contentBottom: bottom,
        centerStepY: targetCenter,
      };
    }
    ordered.forEach((action, i) => {
      const isEmail = action.type === 'send_email';
      built.push({
        id: action.id,
        type: 'step',
        position: { x: 0, y: ys[i + 1] },
        data: {
          kind: isEmail ? 'email' : 'wait',
          enterDelay: enterDelay(i + 1),
          isNew: action.id === newStepId,
          title: isEmail ? 'Send email' : 'Wait',
          subtitle: isEmail
            ? action.data.email_subject || 'Untitled'
            : formatWait(action.data.wait_hours),
          // Blue only while its analytics sheet is open, so the sheet is
          // visibly tied to the card it's reporting on. Click-selection is gone:
          // it painted the same blue border with nothing behind it — every
          // control a card offers is already on the card, so selecting one
          // promised a follow-up that didn't exist.
          selected: action.id === analyticsActionId,
          // Inline-form values + per-node handlers (each edits its own action).
          subject: action.type === 'send_email' ? action.data.email_subject : undefined,
          emailHasContent:
            action.type === 'send_email' ? lexicalHasContent(action.data.email_lexical) : undefined,
          // A blank email, once the user has moved on from it — same treatment as
          // the trigger's Stripe warning, and the same register: the fix, not the
          // failure. Blank means no subject; the body can't be written in the
          // proto (the content dialog is a stub), so counting it would be a
          // warning nothing on this screen can clear.
          warning:
            action.type === 'send_email' &&
            !action.data.email_subject.trim() &&
            action.id !== graceStepId
              ? { message: 'Add a subject line before this email can be sent.' }
              : undefined,
          stats: action.type === 'send_email' ? (action.stats ?? ZERO_EMAIL_STATS) : undefined,
          waitHours: action.type === 'wait' ? action.data.wait_hours : undefined,
          onSubjectChange: (subject: string) => {
            settleOthers(action.id);
            onChange(
              updateSendEmailAction({
                detail: draft,
                actionId: action.id,
                emailSubject: subject,
                emailLexical: action.type === 'send_email' ? action.data.email_lexical : '',
              }),
            );
          },
          onWaitChange: (hours: number) => {
            settleOthers(action.id);
            onChange(updateWaitAction({ detail: draft, actionId: action.id, waitHours: hours }));
          },
          onDelete: () => {
            // Deleting ends any grace outright: either the grace card itself just
            // went, or attention was demonstrably on another card.
            setGraceStepId(null);
            onChange(removeAction({ detail: draft, actionId: action.id }));
          },
          onEditContent: () => {
            settleOthers(action.id);
            setEmailDialogActionId(action.id);
          },
          analyticsOpen: action.id === analyticsActionId,
          onToggleAnalytics: () => {
            settleOthers(action.id);
            // Functional, not a read of analyticsActionId: this closure lives in
            // node data built under useMemo, and a stale read would re-open the
            // sheet on the press that should close it.
            setAnalyticsActionId((current) => (current === action.id ? null : action.id));
          },
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
      data: { intro: introPhase === 'connecting', enterDelay: enterDelay(ordered.length + 1) },
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
                previousActionId: source === TRIGGER_NODE_ID ? undefined : source,
                nextActionId: toExit ? undefined : target,
              },
              toInsertKind(type),
            ),
          // Only the first automation's first connector draws itself. A step
          // inserted later gets its edge the way it always did.
          intro: introPhase === 'connecting',
          alwaysVisible: alwaysShowInserts,
        },
      });
    }
    return {
      nodes: built,
      edges: builtEdges,
      contentBottom: bottom,
      centerStepY: targetCenter,
    };
  }, [
    draft,
    ordered,
    analyticsActionId,
    triggerConfig,
    onTriggerConfigChange,
    changeTriggerConfig,
    triggerWarning,
    triggerLocked,
    graceStepId,
    layout,
    enterDelay,
    newStepId,
    centerStepId,
    showOptions,
    triggerOnly,
    introPhase,
    requestTriggerChange,
    alwaysShowInserts,
  ]);

  // Follow whichever card was asked for, once the column has settled around it.
  // Deliberately a beat later than the animation rather than part of it: the canvas
  // moving under a card that is still fading in reads as one thing failing to hold
  // still.
  //
  // Keyed on the id alone. centerStepY goes on moving as measurements trickle in
  // behind the column's transition, and reacting to that would re-issue the move
  // every frame instead of once per insertion.
  useEffect(() => {
    if (centerStepId === null || centerStepY === null) {
      return;
    }
    const timer = setTimeout(
      () => centerOn(centerStepY, STEP_CENTER_MS, STEP_CENTER_MIN_SHIFT),
      NEW_STEP_MS,
    );
    return () => clearTimeout(timer);
  }, [centerStepId]);

  // Handed to the viewport hook rather than passed in, because it comes out of the
  // layout below — which needs the hook to have run first.
  contentHeightRef.current = contentBottom;

  const translateExtent = useMemo(
    () => panTranslateExtent(contentBottom, size),
    [contentBottom, size],
  );

  return (
    // relative: the analytics sheet slides in over this region.
    <div className="relative flex size-full">
      {/* Held blank until the column is centred — see `entered`. The whole surface,
                not just the cards: the dotted background is positioned by the same
                viewport, so it would slide too. */}
      <div
        ref={canvasRef}
        className={cn(
          'min-h-0 flex-1 transition-opacity duration-200 motion-reduce:transition-none',
          entered ? 'opacity-100' : 'opacity-0',
          // Not until the canvas has settled. During the entrance and the creation
          // sequence the cards are being placed for the first time, and a transition
          // would animate them in from wherever React Flow started them — including
          // the exit card sliding in from the origin.
          entranceOver && NODE_SETTLE_CLASS,
        )}
      >
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
          // A deliberate no-op, NOT a leftover. A bare card click does nothing
          // on any card now, the way it always did on the trigger: every card's
          // fields and controls are on the card itself, so selection had no
          // follow-up to offer — just a blue border promising one. (The
          // analytics sheet still ties itself to its card by that border, from
          // its own open state.)
          //
          // The handler can't simply be removed, though. React Flow puts
          // pointer-events: none on any node that is not selectable, not
          // draggable, and has no click handler (hasPointerEvents, NodeWrapper)
          // — done cleanly, that froze every input, menu and popover on every
          // card, and all that was left working was the pan.
          onNodeClick={() => {}}
          onNodesChange={onNodesChange}
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

      {/* Picking a different trigger from the node's ⋯ resets the settings and exits
                underneath it, which is worth saying out loud before it happens. */}
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
              The settings and exit conditions you’ve set for this trigger will be reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTriggerType) {
                  changeTriggerConfig(triggerConfigFor(pendingTriggerType));
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
                card's inline "Edit email content" button.

                The one thing it CAN do is pretend: the switch writes a seeded
                paragraph into this email's lexical, or empties it again. That's a
                reviewer's control, not a design proposal — the card's empty state
                and blank-email warning both key off whether content exists, and
                without a way to flip that, neither could ever be seen resolving. */}
      <Dialog
        open={emailDialogActionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEmailDialogActionId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email content</DialogTitle>
            <DialogDescription>
              The full email editor isn’t wired up in this prototype — this is where the Koenig
              content editor would open to design the email.
            </DialogDescription>
          </DialogHeader>
          {dialogEmail && (
            <div className="flex items-center justify-between gap-4 rounded-md border border-border-default p-4">
              <div className="flex flex-col gap-0.5">
                <label className="text-md font-medium" htmlFor="simulate-email-content">
                  Simulate written content
                </label>
                <p className="text-sm text-muted-foreground">
                  Stands in for writing the email, so you can see how the card reads with and
                  without content.
                </p>
              </div>
              <Switch
                checked={lexicalHasContent(dialogEmail.data.email_lexical)}
                id="simulate-email-content"
                onCheckedChange={(checked) =>
                  onChange(
                    updateSendEmailAction({
                      detail: draft,
                      actionId: dialogEmail.id,
                      emailSubject: dialogEmail.data.email_subject,
                      emailLexical: checked ? SEEDED_LEXICAL : EMPTY_LEXICAL,
                    }),
                  )
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditCanvas;
