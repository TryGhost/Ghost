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
  type ReactFlowInstance,
  type NodeProps,
  Position,
  ReactFlow,
  getSmoothStepPath,
} from '@xyflow/react';
import type {
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
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
  type TriggerConfig,
  type TriggerType,
  availableTriggerOptions,
  changeUnanswered,
  triggerHasField,
  labelUnanswered,
  segmentUnanswered,
  tiersUnanswered,
  triggerConfigFor,
  triggerExplanation,
  triggerIcon,
  triggerLabel,
  triggerSummary,
  hasTierFilter,
  tierNames,
} from '@/automations/proto/shared/trigger-config';
import { laneOffersStep, laneTriggerOptions } from '@/automations/proto/shared/capabilities';
import type { LaneId } from '@/automations/proto/shared/lanes';
import { useStripeConnected } from '@/automations/proto/shared/store';
import {
  CANVAS_HUD_INSET,
  HIDDEN_HANDLE_STYLE,
  CANVAS_SLOT_FILL,
  EDGE_STROKE,
  NODE_WIDTH,
  formatWait,
  type StepKind,
  stepKindOf,
  stepSubtitle,
  stepTitle,
  lexicalHasContent,
  orderActions,
  panTranslateExtent,
  stepKindIcon,
  useCenteredColumn,
  useDismissOnPanePress,
} from '@/automations/proto/canvas/flow-utils';
import {
  type ProtoAutomationDetail,
  type UpdateMemberAction,
  asApiDetail,
  customFieldName,
  insertUpdateMemberAction,
  isUpdateMemberAction,
} from '@/automations/proto/shared/update-member';
import { UpdateMemberFields } from '@/automations/proto/canvas/update-member-fields';
import {
  EmailAnalyticsSheet,
  type SheetEmail,
} from '@/automations/proto/canvas/email-analytics-sheet';
import { EmailStatsFooter } from '@/automations/proto/canvas/email-analytics';
import {
  NODE_BODY_PADDING,
  NodeCard,
  NodeHeader,
} from '@/automations/proto/canvas/flow-node-shell';
import { useLabels } from '@/automations/proto/shared/labels';
import { useSegments } from '@/automations/proto/shared/segments';
import EMAIL_SNAPSHOT_HTML from './email-snapshot.html?raw';
import { STEP_GAP, useMeasuredColumn } from './measured-column';
import { MODE_STAGGER_MS, resetColumnToTop, useModeEntrance } from './mode-entrance';
import { EMPTY_LEXICAL, SEEDED_LEXICAL } from '@/automations/proto/shared/mock';
import {
  TriggerEmptyState,
  TriggerFieldsForm,
} from '@/automations/proto/canvas/trigger-config-form';

// Which of the trigger's own questions is unanswered, as the card's warning.
//
// A list rather than the ternary chain this was: every trigger with a field has
// exactly one question, and each new trigger added a rung until the chain was
// four deep and the indentation was carrying the meaning. Adding a trigger is
// now one entry.
//
// The predicates are the SHARED ones, so this can't disagree with the screen's
// publish gate or the list's record-level check about what unanswered means.
const UNANSWERED_FIELD_WARNINGS: {
  unanswered: (config: TriggerConfig) => boolean;
  message: string;
}[] = [
  {
    unanswered: tiersUnanswered,
    message: 'Choose tiers before this automation can be published.',
  },
  {
    unanswered: labelUnanswered,
    message: 'Choose a label before this automation can be published.',
  },
  {
    unanswered: changeUnanswered,
    message: 'Choose a subscription change before this automation can be published.',
  },
  {
    unanswered: segmentUnanswered,
    message: 'Choose a segment before this automation can be published.',
  },
];

const unansweredFieldWarning = (config: TriggerConfig): NodeWarning | undefined => {
  const match = UNANSWERED_FIELD_WARNINGS.find((entry) => entry.unanswered(config));
  return match ? { message: match.message } : undefined;
};

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
// helpers here take 'email' | 'wait' | 'update_member'.
//
// StepPickerType is the SHIPPING editor's union and has no member for our third
// step, which is the same reason the action type is proto-local (see
// shared/update-member). So the picker's own value type is widened here rather
// than there, and the row carries the id the API would use.
type ProtoStepPickerType = StepPickerType | 'update_member';

const toInsertKind = (type: ProtoStepPickerType): 'email' | 'wait' | 'update_member' =>
  type === 'send_email' ? 'email' : type === 'wait' ? 'wait' : 'update_member';

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
// Filtered per lane below — the Update member row only exists where the lane
// offers it, the same way the trigger rows are narrowed.
const STEP_PICKER_OPTIONS: PickerOption<ProtoStepPickerType>[] = [
  { value: 'send_email', icon: LucideIcon.Mail, title: 'Email', description: 'Send an email' },
  {
    value: 'update_member',
    icon: LucideIcon.UserPen,
    title: 'Update member',
    description: 'Change a label, a field, or their subscription',
  },
  {
    value: 'wait',
    icon: LucideIcon.Clock,
    title: 'Wait',
    description: 'Add a delay before the next step',
  },
];

// OPTION_PICKER_WIDTH (shared/option-picker) and the + button's size-8, as
// numbers for the offset below. Keep in step with both.
const OPTION_PICKER_WIDTH_PX = 352;
const INSERT_BUTTON_PX = 32;

const AddStepPopover: React.FC<{
  children: React.ReactNode;
  onPick: (type: ProtoStepPickerType) => void;
  // The lane's own rows — see laneStepOptions on the canvas.
  options: PickerOption<ProtoStepPickerType>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ children, onPick, options, open, onOpenChange }) => (
  // Centred on the + itself, both ways, rather than above or below it: the
  // list opens where you pressed. Radix has no "over" side, so it opens to the
  // right, centred vertically on the button, and is pulled back left by half
  // its own width plus half the button's — which lands its centre on the +'s.
  <OptionPicker
    align="center"
    open={open}
    options={options}
    side="right"
    sideOffset={-(OPTION_PICKER_WIDTH_PX / 2 + INSERT_BUTTON_PX / 2)}
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
  // The lane's trigger rows, already narrowed by shared/capabilities and passed
  // down rather than derived here — the node has no business knowing which lane
  // it's in. Phase 1's plainer names arrive the same way.
  triggerOptions?: PickerOption<TriggerType>[];
  // Phase 1's voice: plainer trigger names, and no exit sentence. It used to
  // pick the option LIST too; that job moved to triggerOptions above when a
  // second lane needed a different list for a reason that had nothing to do
  // with how the names read.
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
  // The mode-switch entrance's epoch, keyed onto the animated wrapper so each
  // switch restarts the cascade — see mode-entrance.
  enterKey?: number;
  // Just added by the step picker. Cleared shortly after, so the card doesn't
  // animate again the next time anything re-renders it.
  isNew?: boolean;
  // Asks the canvas to confirm a different trigger. The node doesn't apply it
  // itself: swapping the trigger discards the settings and exits configured under
  // the old one, which is a warning the canvas owns.
  onRequestTriggerChange?: (type: TriggerType) => void;
  // Increments when the trigger's field should open itself — the canvas owns the
  // clock (it knows when its sequence has settled), the form owns the popover.
  fieldRevealSignal?: number;
  // The saved config's tiers — see the EditCanvas prop of the same name.
  savedTierIds?: string[];
  // The create-button variant's handler — see the EditCanvas prop.
  onCreateAutomation?: (config: TriggerConfig) => void;
  // The Update member step's settings, and the handler that writes them —
  // present only on that kind of card.
  updateMember?: UpdateMemberAction['data'];
  onUpdateMemberChange?: (next: UpdateMemberAction['data']) => void;
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
  // Focus: the node whose form is open is the one being worked on. It tells
  // the canvas when it opens and closes, and the canvas makes room around it.
  onFocusChange?: (open: boolean) => void;
  // The grown panel's height, so the canvas can make room for it.
  onFocusHeight?: (height: number) => void;
  // Email only: its content editor is open over the canvas.
  emailDialogOpen?: boolean;
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
// After the sequence settles, one more beat before the trigger's field opens on
// a trigger chosen fresh (see fieldRevealPending). A beat rather than
// immediately: the popover is the nudge — "this is the question left to answer"
// — and it lands as the sequence's closing move, after everything else has
// stopped, which is what makes it the thing the eye ends on. Longer than a
// reaction-shot pause would start to read as the canvas doing things on its own.
const FIELD_REVEAL_DELAY_MS = 200;

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
// The pane card's slide, which the flow's re-centring pan runs alongside. Keep
// in step with the detail screen's chrome duration.
export const PANE_SLIDE_MS = 300;
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
export const ENTER_CLASS = `animate-in duration-320 ${INTRO_EASE} fade-in-0 fill-mode-backwards slide-in-from-bottom-2 motion-reduce:animate-none`;

// The connector drawing itself down to the exit card. A transition rather than
// keyframes, and a class rather than inline style, so motion-reduce can switch it
// off. (The shared canvas also animates the trigger card's height here; a light
// trigger has no body to grow, so that beat has nothing to do.)
// Still the quickest beat — the line is a connection being made, not an object
// arriving — but not so quick that the exit card lands before it has got there.
const INTRO_DRAW_CLASS = `transition-[stroke-dashoffset] duration-180 ${INTRO_EASE} motion-reduce:transition-none`;
// The exit card, held back until the line is most of the way down to it — not all
// the way, so the two overlap rather than queue. The delay is an arbitrary property
// rather than `delay-*`, which tw-animate-css redefines to mean animation-delay,
// and this is a transition.
const INTRO_EXIT_CLASS = `transition-[opacity,translate] duration-180 [transition-delay:120ms] ${INTRO_EASE} motion-reduce:transition-none`;

// ---------------------------------------------------------------------------
// Light nodes.
//
// The other lanes put every step's form ON its card, which makes each card as
// big as its form and the flow a stack of forms. Here the cards only say what a
// step is, and its form opens in a popover on click — the Loops / Flodesk shape,
// with popovers rather than a side sheet.
//
// Two weights, deliberately unequal. An email is content, and content is what a
// publisher came here to make — so it's a visual card showing the email itself.
// Everything else (the trigger, a wait, a member update, the exit) is plumbing
// that routes members between emails, and reads as a quiet one-line row.
// ---------------------------------------------------------------------------

// The layout still thinks in a NODE_WIDTH column (flow-utils centres the
// viewport on it), so each card centres inside a column-width wrapper — the
// same trick the exit node already used for being narrower than the rest.
export const COLUMN_WRAPPER = 'flex w-[400px] justify-center';
// One width for every node, email or not — the column reads as one strip.
export const NODE_CARD_WIDTH = 'w-[300px]';
// Wide enough that the forms the cards used to carry (sized for a 400px card's
// inner width) fit without reflowing.

// A node's panel belongs to the canvas, so it shouldn't draw over the screen's
// header or side panes when it reaches them. A z-index can't do that: Shade
// portals popovers to <body>, outside the app's stacking context, so anything
// low enough to go under the header goes under the whole app. Instead the
// panel is clipped to the canvas's rectangle, every frame while it's open —
// the canvas pans and the panel tracks its node, so the overlap keeps moving.
// Menus opened from inside a panel aren't clipped: they're transient, and need
// to escape it.
const useClipToCanvas = (
  active: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  clipRef: React.RefObject<HTMLElement | null>,
): void => {
  useEffect(() => {
    if (!active) {
      return;
    }
    let frame = 0;
    const tick = () => {
      const canvas = anchorRef.current?.closest('.react-flow')?.getBoundingClientRect();
      const el = clipRef.current;
      if (canvas && el) {
        const box = el.getBoundingClientRect();
        const top = Math.max(0, canvas.top - box.top);
        const right = Math.max(0, box.right - canvas.right);
        const bottom = Math.max(0, box.bottom - canvas.bottom);
        const left = Math.max(0, canvas.left - box.left);
        el.style.clipPath =
          top || right || bottom || left ? `inset(${top}px ${right}px ${bottom}px ${left}px)` : '';
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      if (clipRef.current) {
        clipRef.current.style.clipPath = '';
      }
    };
  }, [active, anchorRef, clipRef]);
};

// Hours / days fields for a wait, lifted out of the old card body unchanged.
const WaitFields: React.FC<{ waitHours: number; onWaitChange?: (hours: number) => void }> = ({
  waitHours,
  onWaitChange,
}) => {
  const wait = splitWait(waitHours);
  const changeWait = (amount: number, unit: 'days' | 'hours') => {
    const hours = waitToHours(amount, unit);
    if (Number.isSafeInteger(hours) && hours > 0) {
      onWaitChange?.(hours);
    }
  };
  // Held while typing so the box can be empty mid-edit — see the note this
  // came from in the shared canvas.
  const [waitText, setWaitText] = useState<string | null>(null);
  return (
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
        onFocus={(e) => e.target.select()}
      />
      <Select
        value={wait.unit}
        onValueChange={(value) => changeWait(wait.amount, value as 'days' | 'hours')}
      >
        <SelectTrigger className="h-9 flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent updatePositionStrategy="always">
          <SelectItem value="hours">Hours</SelectItem>
          <SelectItem value="days">Days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

// The trigger's ⋯ → Change trigger, moved from the card header into the
// popover's. Unchanged otherwise: the menu closes first and the picker hangs
// off the ⋯ itself.
const ChangeTriggerAction: React.FC<{ d: StepNodeData }> = ({ d }) => {
  const stripeConnected = useStripeConnected();
  const [open, setOpen] = useState(false);
  const openPickerOnClose = useRef(false);
  const triggerConfig = d.triggerConfig ?? DEFAULT_TRIGGER_CONFIG;
  return (
    <OptionPicker
      align="end"
      open={open}
      options={availableTriggerOptions(d.triggerOptions ?? [], stripeConnected)}
      value={triggerConfig.type}
      externalAnchor
      onOpenChange={setOpen}
      onSelect={(type) => d.onRequestTriggerChange?.(type)}
    >
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <PopoverAnchor asChild>
            <Button aria-label="Trigger actions" size="icon" variant="ghost">
              <LucideIcon.MoreHorizontal />
            </Button>
          </PopoverAnchor>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          updatePositionStrategy="always"
          onCloseAutoFocus={(event) => {
            if (!openPickerOnClose.current) {
              return;
            }
            openPickerOnClose.current = false;
            event.preventDefault();
            setOpen(true);
          }}
        >
          <DropdownMenuItem onSelect={() => (openPickerOnClose.current = true)}>
            <LucideIcon.Repeat /> Change trigger
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </OptionPicker>
  );
};

// The email card: a miniature of the email on top, the subject beneath — the
// Flodesk read, where the flow is a strip of the emails themselves.
// The email itself, as members will get it — a real render from Ghost, drawn
// at half size so its 600px column fills the 300px node, and cut off by the
// card's bottom edge so it reads as continuing below. Flodesk's read: the flow
// is a strip of the emails themselves.
//
// The render is a snapshot. Ghost's automation email preview endpoint
// (POST /automations/:id/email_preview) turns a subject and lexical into the
// finished HTML with the site's email design — header image, colours, fonts,
// footer — and the shipping email modal already shows it. The
// proto has no saved automations for it to find, so one response was captured
// from a dev site (email-snapshot.html) and every email with content shows it.
// In production each node would fetch its own, cached, and refetch on save.
//
// Live HTML at a scale rather than an image, so it stays sharp at any zoom,
// and inert to the pointer, so a press lands on the node. The subject isn't in
// an email's body, so it doesn't vary here — the node's header carries it.
const EMAIL_RENDER_WIDTH = 600;

// The snapshot as markup for a shadow root: the document's <style> blocks, then
// its body as a div carrying the body's own inline style (a body tag inside a
// shadow root is dropped, and with it the email's background and type). Built
// once, on first use.
let emailSnapshotMarkup: string | null = null;
const getEmailSnapshotMarkup = (): string => {
  if (emailSnapshotMarkup === null) {
    const doc = new DOMParser().parseFromString(EMAIL_SNAPSHOT_HTML, 'text/html');
    const styles = Array.from(doc.head.querySelectorAll('style'))
      .map((style) => style.outerHTML)
      .join('');
    const bodyStyle = doc.body.getAttribute('style') ?? '';
    emailSnapshotMarkup = `${styles}<div style="${bodyStyle}">${doc.body.innerHTML}</div>`;
  }
  return emailSnapshotMarkup;
};

// The email, drawn into a shadow root rather than an iframe.
//
// An iframe loads its document AFTER it's on screen, so every fresh one shows
// white for a beat before the email paints — which the open panel, mounting its
// own preview each time, turned into a flash on every open. A shadow root is
// filled synchronously, before the frame is painted, so the email is simply
// there. It keeps the one thing the iframe was also for: the email's
// stylesheet stays inside it, and the admin's stays out.
//
// The snapshot is a fixed file from this repo, not user content, so there's
// nothing to sandbox that the iframe was protecting against.
const EmailRender: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    root.innerHTML = getEmailSnapshotMarkup();
  }, []);
  return <div ref={hostRef} className={className} style={style} aria-hidden />;
};

// Two ways the email sits. On the node it fills the card edge to edge below
// the header, cut off by the card's bottom edge so it reads as continuing
// below. In the open panel it's inset on the panel's padding, rounded all
// round and bordered — a white email on a white panel, and the edge is what
// makes it read as a thing of its own there — and it's how you get into the
// editor: hovering it offers "Edit email".
//
// The panel's preview starts as the node's — same place, same size, square
// and borderless — and moves to its inset as the panel grows, the email
// inside scaling with it. `expanded` is the panel's own flag, so the two run
// on one clock and reverse together.
//
// Square — tall enough to get past the header image into the email itself,
// which a short strip never did, without a portrait ratio making one email as
// tall as several steps. (2:3, 3:4 and 5:6 were all tried, each shorter.)
// Height over width; the class below has to say the same thing, since Tailwind
// can't read a ratio built at runtime.
const EMAIL_PREVIEW_RATIO = 1;
const EMAIL_PREVIEW_ASPECT = 'aspect-square';
const EMAIL_NODE_THUMBNAIL_WIDTH = 300;
// The panel's 380 less 24 either side.
const EMAIL_INSET_THUMBNAIL_WIDTH = 332;
const EMAIL_INSET_MARGIN = 24;
// What the inset adds to the preview's height — the grow has to be measured
// before it happens, so this is added to the measurement rather than read.
const EMAIL_INSET_EXTRA_HEIGHT =
  (EMAIL_INSET_THUMBNAIL_WIDTH - EMAIL_NODE_THUMBNAIL_WIDTH) * EMAIL_PREVIEW_RATIO;
const thumbnailTransition = (closing: boolean) =>
  `${closing ? 'duration-140' : 'duration-180'} ${PROTO_EASE} motion-reduce:transition-none`;

export const EmailThumbnail: React.FC<{
  // Only what the preview reads, so the run canvas can draw one without a whole
  // edit node's data. No onEditContent = read-only: no "Edit email" on hover.
  d: Pick<StepNodeData, 'emailHasContent' | 'onEditContent'>;
  // The panel's preview, and whether the panel has grown / is shrinking.
  inset?: boolean;
  expanded?: boolean;
  closing?: boolean;
}> = ({ d, inset = false, expanded = false, closing = false }) => {
  const grown = inset && expanded;
  const editable = inset ? grown : true;
  const width = grown ? EMAIL_INSET_THUMBNAIL_WIDTH : EMAIL_NODE_THUMBNAIL_WIDTH;
  const scale = width / EMAIL_RENDER_WIDTH;
  // Rendered tall enough for the grown size, so growing never uncovers blank.
  const renderHeight =
    (EMAIL_INSET_THUMBNAIL_WIDTH * EMAIL_PREVIEW_RATIO) /
    (EMAIL_NODE_THUMBNAIL_WIDTH / EMAIL_RENDER_WIDTH);
  return (
    <span
      className={cn(
        'group/preview relative block overflow-hidden border bg-white',
        EMAIL_PREVIEW_ASPECT,
        inset &&
          `transition-[margin,width,border-radius,border-color] ${thumbnailTransition(closing)}`,
        grown ? 'rounded-lg border-border-default' : 'rounded-none border-transparent',
        // The node's own preview has no border to hide — its edges are the card's.
        !inset && 'border-0',
      )}
      style={{ width, marginLeft: grown ? EMAIL_INSET_MARGIN : 0 }}
    >
      {d.emailHasContent ? (
        <EmailRender
          className={cn(
            'pointer-events-none origin-top-left overflow-hidden',
            inset && `transition-transform ${thumbnailTransition(closing)}`,
          )}
          style={{
            width: EMAIL_RENDER_WIDTH,
            height: renderHeight,
            transform: `scale(${scale})`,
          }}
        />
      ) : (
        <span className="flex h-full flex-col items-center justify-center gap-1.5 bg-background pb-5 text-muted-foreground">
          <LucideIcon.PenLine className="size-4" />
          <span className="text-xs">Nothing written yet</span>
        </span>
      )}
      {/* Revealed by hovering the preview, or by focusing the button itself —
          on the node as well as in the panel, so the way into the editor is
          one press from the canvas. It stops the press there: on the node, the
          click would otherwise also open the node's panel. In the panel, only
          once grown: mid-morph it would be a control arriving before the thing
          it acts on has settled. */}
      {d.onEditContent && (
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center opacity-0 transition-opacity',
            editable && 'group-hover/preview:opacity-100 focus-within:opacity-100',
          )}
        >
          <Button
            tabIndex={editable ? 0 : -1}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              d.onEditContent?.();
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <LucideIcon.PenLine />
            {d.emailHasContent ? 'Edit email' : 'Write email'}
          </Button>
        </span>
      )}
    </span>
  );
};

// "Send Welcome to the club" — the action and its object in one line.
const emailTitle = (d: StepNodeData): string => {
  const subject = d.subject?.trim() ?? '';
  return subject ? `Send ${subject}` : d.title;
};

const EmailNodeFace: React.FC<{
  d: StepNodeData;
  // The morph's header controls, and its title wrapping — see StepNodeFace.
  actions?: React.ReactNode;
  matchNode?: boolean;
  // The morph's panel shows the header only: its body is the form, where the
  // content is a field rather than a picture of the email.
  headerOnly?: boolean;
}> = ({ d, actions, matchNode = false, headerOnly = false }) => {
  return (
    <>
      {/* The same header row as every other node — icon, then what the step does
          — so the email card is the others plus a preview, not a different kind
          of object. The title is the action and its object in one line: "Send
          Welcome to the club". Without a subject it falls back to the step's
          name. */}
      <span
        className={cn(
          'flex items-center gap-3 px-6 py-5',
          !headerOnly && 'border-b border-border-default',
        )}
      >
        <StepNodeFace
          icon={LucideIcon.Send}
          matchNode={matchNode}
          title={emailTitle(d)}
          warning={Boolean(d.warning)}
        />
        {actions}
      </span>
      {!headerOnly && <EmailThumbnail d={d} />}
    </>
  );
};

// Every other step: icon, what it is, and what it does. Wraps rather than
// truncating — the title is the whole sentence of what the step does, and a
// sentence cut off is one you have to open the node to read. The icons stay
// on the first line.
//
// `matchNode` is for the morph's header: the panel is wider than the node, so
// left alone its title would break at different points and the row would
// change height as it opened. Capped at the node's own text width, it wraps
// exactly where the node did.
const NODE_TEXT_WIDTH = 224; // 300 − 2×24 padding − 16 icon − 12 gap
const WARNING_ICON_SPACE = 28; // 16 icon + 12 gap

export const StepNodeFace: React.FC<{
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
  warning: boolean;
  matchNode?: boolean;
}> = ({ icon: Icon, title, subtitle, warning, matchNode = false }) => (
  <>
    {Icon && <Icon className="mt-0.5 size-4 shrink-0 self-start text-muted-foreground" />}
    <span
      className="flex min-w-0 flex-1 flex-col"
      style={
        matchNode ? { maxWidth: NODE_TEXT_WIDTH - (warning ? WARNING_ICON_SPACE : 0) } : undefined
      }
    >
      <span className="text-base font-medium text-pretty break-words">{title}</span>
      {subtitle && (
        <span className="text-sm text-pretty break-words text-muted-foreground">{subtitle}</span>
      )}
    </span>
    {warning && (
      <LucideIcon.TriangleAlert className="mt-0.5 size-4 shrink-0 self-start text-state-warning" />
    )}
  </>
);

// The subject, in the same field the other lanes' email cards use. It sits
// above the preview — the email's first line, read in the order an inbox shows
// it. There's no body field: the preview below IS the body, and opens the
// editor.
//
// The field holds its own text while it's being typed in. Bound straight to
// `d.subject`, every keystroke rendered the input once with the OLD subject —
// React Flow hands node data down a tick after the draft changes — and React
// wrote that stale value back into the DOM, which throws the caret to the end.
// Local text can't lag; the draft still gets every keystroke, and an outside
// change (the draft resetting, say) is picked up whenever the field isn't
// being typed in.
const EmailSubjectField: React.FC<{ d: StepNodeData }> = ({ d }) => {
  const subject = d.subject ?? '';
  const [text, setText] = useState(subject);
  const [editing, setEditing] = useState(false);
  const [prevSubject, setPrevSubject] = useState(subject);
  if (prevSubject !== subject) {
    setPrevSubject(subject);
    if (!editing) {
      setText(subject);
    }
  }
  return (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <InputGroupText>Subject</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        value={text}
        onBlur={() => {
          setEditing(false);
          setText(subject);
        }}
        onChange={(event) => {
          setText(event.target.value);
          d.onSubjectChange?.(event.target.value);
        }}
        onFocus={() => setEditing(true)}
      />
    </InputGroup>
  );
};

// ---------------------------------------------------------------------------
// Morph: the node grows into its own form.
//
// Clicking doesn't open a popover NEXT to the node — the popover opens exactly
// over it, at its size and in its material, and grows from its centre: wider on
// both sides, taller both up and down, lifting as it goes — so it stays centred
// between the nodes above and below. Its header row is the node's row, carried
// up with the top edge, and the form arrives beneath it. Closing plays it back
// into the node.
//
// Radix still owns being a popover (outside press, Escape, focus); the size is
// ours. Width and height animate rather than a scale, so text stays crisp and
// the border and shadow stay real. The content is laid out once at full width
// and the panel clips it — nothing reflows while the card grows.
//
// Every node, the email included — its preview is part of the header it grows from.
// ---------------------------------------------------------------------------

// Wider than the node: at the node's own 300px the forms' side-by-side rows
// (add/remove + label, field + value) were too cramped to use.
const MORPH_WIDTH = 380;
const MORPH_OPEN_MS = 180;
const MORPH_CLOSE_MS = 140;
// Transitions as classes so motion-reduce can switch them off; durations as
// literals so Tailwind can see them. Keep in step with the constants above.
const MORPH_OPEN_CLASS = `transition-[width,height,box-shadow,translate] duration-180 ${PROTO_EASE} motion-reduce:transition-none`;
const MORPH_CLOSE_CLASS = `transition-[width,height,box-shadow,translate] duration-140 ${PROTO_EASE} motion-reduce:transition-none`;
// The form fades in once the card has started growing, and leaves quickly
// ahead of it shrinking — content never outlives the space it sits in.
const MORPH_FADE_IN =
  'transition-opacity duration-140 [transition-delay:40ms] motion-reduce:transition-none';
const MORPH_FADE_OUT = 'transition-opacity duration-80 motion-reduce:transition-none';
// Shade's PopoverContent brings its own surface, padding and zoom-in. The morph
// is the surface and the animation, so the content element is reduced to a
// positioned, transparent box.
const MORPH_CONTENT_RESET =
  'rounded-none border-0 bg-transparent p-0 shadow-none data-[state=closed]:animate-none data-[state=open]:animate-none';

type MorphPhase = 'closed' | 'opening' | 'open' | 'closing';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The trigger's title, in the same register as the steps' — "When …", then
// the answer that makes it specific. Until the form has that answer, the
// sentence names the trigger in general rather than leaving a gap.
const triggerTitle = (
  config: TriggerConfig,
  labels: { id: string; name: string }[],
  segments: { id: string; name: string }[],
): string => {
  switch (config.type) {
    case 'member_subscribes':
      return 'When someone signs up';
    case 'paid_subscription_starts': {
      const tiers = hasTierFilter(config) ? tierNames(config.tierIds) : [];
      if (tiers.length === 1) {
        return `When someone subscribes to ${tiers[0]}`;
      }
      if (tiers.length === 2) {
        return `When someone subscribes to ${tiers[0]} or ${tiers[1]}`;
      }
      if (tiers.length > 2) {
        return `When someone subscribes to ${tiers.length} tiers`;
      }
      return 'When a paid subscription starts';
    }
    case 'label_added': {
      const label = labels.find((entry) => entry.id === config.labelId)?.name;
      return label ? `When ${label} label is added` : 'When a label is added';
    }
    case 'paid_subscription_changed':
      return config.change === 'upgraded'
        ? 'When a subscription is upgraded'
        : config.change === 'downgraded'
          ? 'When a subscription is downgraded'
          : config.change === 'ended'
            ? 'When a subscription ends'
            : 'When a paid subscription changes';
    case 'segment_entered': {
      const segment = segments.find((entry) => entry.id === config.segmentId)?.name;
      return segment ? `When a member enters ${segment}` : 'When a member enters a segment';
    }
  }
};

// The node's title for the morphing steps: the whole step as one line, built
// from what's been chosen, so the flow reads as a list of things that happen —
// "Wait 3 days", "Add Webinar signup label". Read live, so it follows the form
// while it's being filled in. Before the answer that completes it, the sentence
// stays generic rather than showing a gap ("Add a label", not "Add  label").
const morphTitle = (
  d: StepNodeData,
  labels: { id: string; name: string }[],
  segments: { id: string; name: string }[],
): string => {
  if (d.kind === 'trigger') {
    return triggerTitle(d.triggerConfig ?? DEFAULT_TRIGGER_CONFIG, labels, segments);
  }
  if (d.kind === 'wait') {
    return `Wait ${formatWait(d.waitHours ?? 24)}`;
  }
  if (d.kind === 'email') {
    return emailTitle(d);
  }
  const data = d.updateMember;
  if (d.kind !== 'update_member' || !data) {
    return d.title;
  }
  if (data.operation === 'unsubscribe') {
    return 'Unsubscribe from all emails';
  }
  if (data.operation === 'label') {
    const verb = data.label_mode === 'add' ? 'Add' : 'Remove';
    const label = labels.find((entry) => entry.id === data.label_id)?.name;
    return label ? `${verb} ${label} label` : `${verb} a label`;
  }
  const field = customFieldName(data.field_id);
  const value = data.field_value.trim();
  if (!field) {
    return 'Update a field';
  }
  return value ? `Set ${field} to ${value}` : `Set ${field}`;
};

const MorphNode: React.FC<{ d: StepNodeData }> = ({ d }) => {
  const [phase, setPhase] = useState<MorphPhase>('closed');
  const phaseRef = useRef<MorphPhase>('closed');
  phaseRef.current = phase;
  // Whether the panel is at its grown size. Separate from phase so each
  // transition has a committed start value to run from — see the effects.
  const [expanded, setExpanded] = useState(false);
  // The node's size ON SCREEN (so at the canvas's zoom), read at the moment of
  // opening or closing — the panel starts from and returns to exactly this.
  const [from, setFrom] = useState({ width: 0, height: 0 });
  // The form's full height, measured once it's mounted.
  const [toHeight, setToHeight] = useState<number | null>(null);
  // The height the panel opened at. Once it's open, its position and the room
  // around it are held to THIS, not to whatever the form grows or shrinks to
  // while you edit — see the resize effect below.
  const [anchorHeight, setAnchorHeight] = useState<number | null>(null);

  // The node's height, held while its panel is out. The node stays mounted
  // (invisible) under the panel and keeps rendering what's being edited — a
  // title that wraps onto another line, a subject getting longer — and every
  // change to its height re-laid the column: the neighbours moved and the panel
  // re-centred under the cursor mid-edit. Frozen at its size on opening (layout
  // pixels, not the zoomed screen ones) and released once the panel is back
  // inside it, so the column settles once, after you're done.
  const [frozenHeight, setFrozenHeight] = useState<number | null>(null);
  // The node itself — a <button>, or for an email a div acting as one — held
  // by a callback ref so either element fits.
  const triggerRef = useRef<HTMLElement | null>(null);
  const setTrigger = useCallback((el: HTMLElement | null) => {
    triggerRef.current = el;
  }, []);
  const outerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const subjectRowRef = useRef<HTMLDivElement>(null);
  // Also held as state: Radix's portal mounts the content a render after the
  // popover opens, and the grow can't be measured until it's there.
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
  const isTrigger = d.kind === 'trigger';
  const isEmail = d.kind === 'email';
  const triggerConfig = d.triggerConfig ?? DEFAULT_TRIGGER_CONFIG;
  // Send rather than the shared Mail for an email: the node is the act of
  // sending, and the icon is local so the other lanes keep theirs.
  const icon = isTrigger
    ? triggerIcon(triggerConfig)
    : isEmail
      ? LucideIcon.Send
      : stepKindIcon[d.kind];
  // Subscribed so a label created from inside the form names the node at once.
  const labels = useLabels();
  const segments = useSegments();
  const title = morphTitle(d, labels, segments);

  // Read through a ref: the open/close callbacks are stable, and the handler
  // the canvas passes is rebuilt every render.
  const onFocusChangeRef = useRef(d.onFocusChange);
  onFocusChangeRef.current = d.onFocusChange;
  const onFocusHeightRef = useRef(d.onFocusHeight);
  onFocusHeightRef.current = d.onFocusHeight;

  const readNode = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  };

  const requestOpen = useCallback(() => {
    if (phaseRef.current !== 'closed') {
      return;
    }
    setFrom(readNode());
    setToHeight(null);
    setExpanded(false);
    setFrozenHeight(triggerRef.current?.offsetHeight ?? null);
    setPhase('opening');
    onFocusChangeRef.current?.(true);
  }, []);

  const requestClose = useCallback(() => {
    if (phaseRef.current === 'closed' || phaseRef.current === 'closing') {
      return;
    }
    // Pin the current (auto) height so there's a number to shrink from, and
    // re-read the node — the canvas may have panned or zoomed while open.
    setToHeight(panelRef.current?.offsetHeight ?? null);
    setFrom(readNode());
    setPhase('closing');
    onFocusChangeRef.current?.(false);
  }, []);

  // Opening: the panel has mounted at the node's size. Measure the form, force
  // that start size to be computed, then grow on the next frame.
  //
  // Not keyed on toHeight: measuring sets it, and if that re-ran this effect
  // its cleanup would cancel the grow it just queued.
  useLayoutEffect(() => {
    if (phase !== 'opening' || !contentEl) {
      return;
    }
    // The email's panel grows parts of itself as it opens — the subject row
    // from nothing, the preview to its inset size — so what's on screen now is
    // shorter than where it's going. Those are added rather than measured.
    const height =
      contentEl.offsetHeight +
      (isEmail ? (subjectRowRef.current?.offsetHeight ?? 0) + EMAIL_INSET_EXTRA_HEIGHT : 0);
    void panelRef.current?.offsetWidth;
    setToHeight(height);
    setAnchorHeight(height);
    onFocusHeightRef.current?.(height);
    const frame = requestAnimationFrame(() => setExpanded(true));
    const timer = setTimeout(() => setPhase('open'), reducedMotion() ? 0 : MORPH_OPEN_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [phase, contentEl]);

  // Closing: the panel is pinned at its current size. Force that, then shrink
  // back to the node on the next frame, and unmount once it's there.
  useLayoutEffect(() => {
    if (phase !== 'closing') {
      return;
    }
    void panelRef.current?.offsetWidth;
    const frame = requestAnimationFrame(() => setExpanded(false));
    const timer = setTimeout(
      () => {
        setPhase('closed');
        setFrozenHeight(null);
      },
      reducedMotion() ? 0 : MORPH_CLOSE_MS,
    );
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [phase]);

  // Open, the form can change height under you — switching an update from
  // "unsubscribe" to "add a label" adds a row, the paid trigger's exit sentence
  // rewraps as its tiers change. The height is tracked so the box stays big
  // enough, but NOTHING moves for it: the panel keeps the top edge it opened
  // with and grows or shrinks at the bottom, and the room made for it in the
  // column stays at its opening size. Re-centring on every change had the
  // panel — and any menu open inside it — sliding under the cursor, and the
  // nodes below shuffling, while you were mid-edit.
  useEffect(() => {
    if (phase !== 'open' || !contentEl) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setToHeight(contentEl.offsetHeight);
    });
    observer.observe(contentEl);
    return () => observer.disconnect();
  }, [phase, contentEl]);

  // Once grown, the first field — the number, selected, ready to be typed over.
  // preventScroll: the panel clips its content, and a focus that scrolled it
  // would shift the form inside the card.
  // Only where the first field is one you type in — the wait's number, the
  // email's subject. The trigger and the member update lead with pickers, and focusing one opens it — a menu
  // on top of a panel that has only just arrived.
  const focusOnOpen = d.kind === 'wait' || isEmail;
  useEffect(() => {
    if (phase === 'open' && focusOnOpen) {
      contentRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    }
  }, [phase, focusOnOpen]);

  // A trigger chosen fresh grows open when the canvas says its sequence has
  // settled — the question left to answer is in the form.
  const firstReveal = useRef(d.fieldRevealSignal);
  useEffect(() => {
    if (d.fieldRevealSignal !== firstReveal.current) {
      requestOpen();
    }
  }, [d.fieldRevealSignal, requestOpen]);

  // A step you just added grows open once it has landed.
  const openOnMount = useRef(Boolean(d.isNew)).current;
  useEffect(() => {
    if (!openOnMount) {
      return;
    }
    const timer = setTimeout(requestOpen, NEW_STEP_MS);
    return () => clearTimeout(timer);
  }, [openOnMount, requestOpen]);

  const active = phase !== 'closed';
  useDismissOnPanePress(active, requestClose);
  useClipToCanvas(active, triggerRef, outerRef);

  const outerHeight = toHeight ?? from.height;

  // The header's controls, fading in as the node grows. Pulled into the
  // padding so a 36px button doesn't make the row taller than the node's. The
  // trigger can't be deleted — its action is changing it.
  //
  // ml-auto: the title is capped at the node's text width (matchNode) so it
  // wraps where the node's did, which means it no longer fills the row — left
  // to flow, the controls sat right after it, mid-panel. self-start + the -8px
  // top pull centres a 36px button on the title's FIRST line, the same line
  // the step icon sits on, so a wrapped title doesn't drag it down.
  const headerActions = (
    <span
      className={cn(
        '-my-2 -mr-2 ml-auto flex self-start',
        expanded ? `opacity-100 ${MORPH_FADE_IN}` : `opacity-0 ${MORPH_FADE_OUT}`,
      )}
    >
      {isTrigger ? (
        !d.triggerLocked && d.onRequestTriggerChange && <ChangeTriggerAction d={d} />
      ) : (
        <>
          {isEmail && d.stats && (
            <Button
              aria-label={d.analyticsOpen ? 'Hide email analytics' : 'View email analytics'}
              aria-pressed={d.analyticsOpen}
              className={cn(d.analyticsOpen && 'bg-muted')}
              size="icon"
              type="button"
              variant="ghost"
              data-email-analytics-toggle
              onClick={d.onToggleAnalytics}
            >
              <LucideIcon.ChartNoAxesColumn />
            </Button>
          )}
          {/* Muted at rest, full strength on hover: a destructive control shouldn't
              be the loudest thing in the panel's header. Same as the settings
              panel's row deletes. */}
          <Button
            aria-label="Delete step"
            className="text-muted-foreground hover:text-foreground"
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => d.onDelete?.()}
          >
            <LucideIcon.Trash2 />
          </Button>
        </>
      )}
    </span>
  );

  // Settled open, the height goes back to auto so the card follows its content.
  const panelStyle: React.CSSProperties =
    phase === 'open'
      ? { width: MORPH_WIDTH }
      : expanded
        ? { width: MORPH_WIDTH, height: toHeight ?? undefined }
        : { width: from.width, height: from.height };

  const frozenStyle: React.CSSProperties | undefined =
    frozenHeight === null ? undefined : { height: frozenHeight, overflow: 'hidden' };

  const nodeClassName = cn(
    'nodrag nopan flex cursor-pointer rounded-xl border bg-surface-elevated text-left shadow-sm transition-colors hover:border-border-strong',
    isEmail ? 'flex-col overflow-hidden' : 'items-center gap-3 px-6 py-5',
    NODE_CARD_WIDTH,
    d.warning ? 'border-state-warning' : 'border-border-default',
    // The panel is this node, grown; while it's out, the node isn't also
    // here. Invisible rather than gone so it still anchors.
    active && 'invisible',
  );

  return (
    <div
      key={d.enterKey}
      className={cn(
        COLUMN_WRAPPER,
        d.enterDelay !== undefined ? ENTER_CLASS : d.isNew && NEW_STEP_CLASS,
      )}
      style={d.enterDelay === undefined ? undefined : { animationDelay: `${d.enterDelay}ms` }}
    >
      <Handle position={Position.Top} style={HIDDEN_HANDLE_STYLE} type="target" />
      <Popover
        modal={false}
        open={active}
        onOpenChange={(next) => (next ? requestOpen() : requestClose())}
      >
        {isEmail ? (
          // A div acting as the button rather than a <button>: the email's
          // preview carries an "Edit email" button of its own, and a button
          // can't hold another. So it's an anchor with the button's behaviour
          // — focusable, Enter / Space — and opens the panel itself.
          <PopoverAnchor asChild>
            <div
              ref={setTrigger}
              aria-expanded={active}
              aria-haspopup="dialog"
              className={nodeClassName}
              role="button"
              style={frozenStyle}
              tabIndex={0}
              onClick={requestOpen}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  requestOpen();
                }
              }}
            >
              <EmailNodeFace d={d} />
            </div>
          </PopoverAnchor>
        ) : (
          <PopoverTrigger asChild>
            <button ref={setTrigger} className={nodeClassName} style={frozenStyle} type="button">
              <StepNodeFace icon={icon} title={title} warning={Boolean(d.warning)} />
            </button>
          </PopoverTrigger>
        )}
        <PopoverContent
          ref={outerRef}
          align="center"
          avoidCollisions={false}
          className={cn(MORPH_CONTENT_RESET, 'flex items-center justify-center')}
          side="bottom"
          // Grows from the node's centre, so it stays centred between the nodes
          // above and below. The content box is held at the panel's full height
          // with the panel centred inside it, and pulled up so the box's middle
          // sits on the node's middle — the panel then only has to change size.
          // Open, held to the height it opened at (anchorHeight), so a change
          // in the form's height moves the bottom edge only.
          sideOffset={
            -(from.height + (phase === 'open' ? (anchorHeight ?? outerHeight) : outerHeight)) / 2
          }
          style={{ width: MORPH_WIDTH, height: phase === 'open' ? undefined : outerHeight }}
          updatePositionStrategy="always"
          // Radix restores focus to the trigger on close, which would land on an
          // invisible button mid-shrink; focus on open waits for the grow.
          onCloseAutoFocus={(event) => event.preventDefault()}
          // The email editor opens from inside this panel, as a modal over
          // everything — and to Radix, focus moving into it and presses on it
          // are both "outside" this popover. The panel stays: closing the
          // editor should land you back where you were, not on a shrunk node.
          onInteractOutside={(event) => {
            if (d.emailDialogOpen) {
              event.preventDefault();
            }
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div
            ref={panelRef}
            className={cn(
              'overflow-hidden rounded-xl border bg-surface-elevated',
              d.warning ? 'border-state-warning' : 'border-border-default',
              phase === 'closing' ? MORPH_CLOSE_CLASS : MORPH_OPEN_CLASS,
              expanded ? '-translate-y-0.5 shadow-lg' : 'shadow-sm',
            )}
            style={panelStyle}
          >
            {/* Laid out at the full width from the first frame; the panel clips
                it. The header's padding is the node's, measured from the panel's
                left edge — so as that edge moves out, the row goes with it. */}
            <div
              ref={(el) => {
                contentRef.current = el;
                setContentEl(el);
              }}
              style={{ width: MORPH_WIDTH }}
            >
              {isEmail ? (
                <>
                  <EmailNodeFace actions={headerActions} d={d} headerOnly matchNode />
                  {/* Opens from nothing as the panel grows, so the preview
                      slides down to make room rather than starting lower
                      than the node's. grid-rows 0fr → 1fr is the transition
                      that can animate to an auto height. */}
                  <div
                    className={cn(
                      'grid',
                      `transition-[grid-template-rows] ${thumbnailTransition(phase === 'closing')}`,
                      expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden">
                      <div
                        ref={subjectRowRef}
                        className={cn(
                          'px-6 pb-4',
                          expanded ? `opacity-100 ${MORPH_FADE_IN}` : `opacity-0 ${MORPH_FADE_OUT}`,
                        )}
                      >
                        <EmailSubjectField d={d} />
                      </div>
                    </div>
                  </div>
                  <EmailThumbnail closing={phase === 'closing'} d={d} expanded={expanded} inset />
                </>
              ) : (
                <div className="flex items-center gap-3 px-6 py-5">
                  <StepNodeFace icon={icon} title={title} warning={Boolean(d.warning)} matchNode />
                  {headerActions}
                </div>
              )}
              <div
                className={cn(
                  'px-6 pb-6',
                  isEmail && 'pt-4',
                  expanded ? `opacity-100 ${MORPH_FADE_IN}` : `opacity-0 ${MORPH_FADE_OUT}`,
                )}
              >
                {d.warning && <p className="mb-3 text-md">{d.warning.message}</p>}
                {isTrigger ? (
                  !d.onTriggerConfigChange ? (
                    <p className="text-control text-muted-foreground">
                      {triggerSummary(triggerConfig)}
                    </p>
                  ) : triggerHasField(triggerConfig) ? (
                    <TriggerFieldsForm
                      config={triggerConfig}
                      savedTierIds={d.savedTierIds}
                      showExits={!d.simpleTriggerNames}
                      onChange={d.onTriggerConfigChange}
                    />
                  ) : (
                    <p className="text-control text-muted-foreground">
                      {triggerExplanation(triggerConfig)}
                    </p>
                  )
                ) : isEmail ? (
                  d.stats && <EmailStatsFooter divider={false} stats={d.stats} />
                ) : d.kind === 'update_member' && d.updateMember && d.onUpdateMemberChange ? (
                  <UpdateMemberFields data={d.updateMember} onChange={d.onUpdateMemberChange} />
                ) : (
                  <WaitFields waitHours={d.waitHours ?? 24} onWaitChange={d.onWaitChange} />
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Handle position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} type="source" />
    </div>
  );
};

// The trigger card while it's still asking what starts this automation — kept
// as the full card with its options inline, since creating is a question to
// answer on the canvas, not a step to click into. Once answered, the trigger
// becomes a light node like the rest.
const UnsetTriggerNode: React.FC<{ d: StepNodeData }> = ({ d }) => (
  // Centred in the column like the light nodes — NodeCard is 400px by default.
  <div className={COLUMN_WRAPPER}>
    <NodeCard
      className={cn(
        NODE_CARD_WIDTH,
        // sm to match the light nodes (NodeCard's own frame is also shadow-sm).
        'shadow-sm',
        d.enterDelay !== undefined && ENTER_CLASS,
        `animate-in duration-300 ${INTRO_EASE} fade-in-0 slide-in-from-top-2 motion-reduce:animate-none`,
      )}
      style={d.enterDelay === undefined ? undefined : { animationDelay: `${d.enterDelay}ms` }}
    >
      <NodeHeader title={d.title} />
      <div className="nodrag nopan cursor-default" onClick={(e) => e.stopPropagation()}>
        <div className={NODE_BODY_PADDING}>
          <div
            className={cn(
              d.introPhase === 'leaving' &&
                'animate-out duration-120 ease-in fade-out-0 fill-mode-forwards motion-reduce:animate-none',
            )}
          >
            {d.onTriggerConfigChange && (
              <TriggerEmptyState
                options={d.triggerOptions ?? []}
                onCreate={d.onCreateAutomation}
                onSelect={d.onTriggerConfigChange}
              />
            )}
          </div>
        </div>
      </div>
    </NodeCard>
  </div>
);

const StepNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as StepNodeData;
  if (d.kind === 'trigger' && d.triggerUnset) {
    return <UnsetTriggerNode d={d} />;
  }
  return <MorphNode d={d} />;
};

// Where the flow ends — a light node like the steps above it, quieter still:
// nothing to click, and muted, because it reports rather than offers.
const ExitNode: React.FC<NodeProps> = ({ data }) => {
  const enterDelay = (data as { enterDelay?: number } | undefined)?.enterDelay;
  const enterKey = (data as { enterKey?: number } | undefined)?.enterKey;
  // Lands after the connector has drawn down to it — see the shared canvas.
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
    <div
      key={enterKey}
      className={cn(
        COLUMN_WRAPPER,
        enterDelay !== undefined && ENTER_CLASS,
        intro && INTRO_EXIT_CLASS,
        intro && !shown && 'translate-y-2 opacity-0',
      )}
      style={enterDelay === undefined ? undefined : { animationDelay: `${enterDelay}ms` }}
    >
      <Handle position={Position.Top} style={HIDDEN_HANDLE_STYLE} type="target" />
      <div
        className={cn(
          NODE_CARD_WIDTH,
          'flex items-center gap-3 rounded-xl border border-border-default bg-surface-elevated px-6 py-5 text-muted-foreground shadow-sm',
        )}
      >
        <LucideIcon.LogOut className="size-4 shrink-0" strokeWidth={2} />
        <span className="text-base font-medium">Exit automation</span>
      </div>
    </div>
  );
};

const nodeTypes = { step: StepNode, exit: ExitNode };

type PlusEdgeData = {
  onPick: (type: ProtoStepPickerType) => void;
  // The lane's step rows, carried on the edge because the popover that shows
  // them hangs off it — see laneStepOptions.
  stepOptions: PickerOption<ProtoStepPickerType>[];
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
  const stepOptions = (data as PlusEdgeData | undefined)?.stepOptions ?? [];
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
            <AddStepPopover
              open={open}
              options={stepOptions}
              onOpenChange={setOpen}
              onPick={onPick}
            >
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
  draft: ProtoAutomationDetail;
  // Bumped by the screen on switching into or out of reviewing a run: the canvas
  // goes back to the top and its cards cascade in. See mode-entrance.
  enterSignal?: number;
  onChange: (next: ProtoAutomationDetail) => void;
  // Trigger config lives with the screen (it isn't part of AutomationDetail yet).
  // Without a change handler the trigger renders as a read-only summary.
  //
  // `null` is a created automation with nothing chosen yet: the canvas collapses
  // to the trigger card alone until it's answered.
  triggerConfig?: TriggerConfig | null;
  onTriggerConfigChange?: (next: TriggerConfig) => void;
  // The SAVED config's tiers, for the tiers list's archived rule: an archived
  // tier stays offered while it's in the current selection OR this list, so
  // unticking one is reversible for exactly as long as the removal is unsaved
  // — the undo horizon matching the draft horizon, like every other edit on
  // the screen. The screen passes [] when the saved trigger is a different
  // type (its tiers answer a question this trigger isn't asking).
  savedTierIds?: string[];
  // The screen's verdict on the trigger — see NodeWarning. The canvas just
  // wears it; whether Stripe is connected is the screen's business.
  triggerWarning?: NodeWarning;
  triggerLocked?: boolean;
  // Which lane is drawing this canvas. Its only job here is to ask
  // shared/capabilities which triggers to offer — the canvas is shared, the
  // trigger vocabulary is shared, and this is the one line that says which
  // subset of it this screen is allowed to show.
  lane: LaneId;
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
  // The create-button variant's pre-create state (see CREATION_SLOT): the
  // empty trigger card's options become SELECTIONS with a Create button
  // beneath, and pressing it hands the chosen config up instead of applying
  // it — the screen owns what creating means. Present only before the
  // automation exists.
  onCreateAutomation?: (config: TriggerConfig) => void;
  // Same variant, same moment: no zoom controls while the screen is one card
  // and a question — HUD is chrome for a flow, and there isn't one yet.
  hideControls?: boolean;
  // Width covered on the canvas's right by something floating over it — the
  // pane card. The flow centres in what's left, and pans across when it
  // changes. 0 when nothing covers it.
  rightInset?: number;
}

export const EditCanvas: React.FC<EditCanvasProps> = ({
  draft,
  onChange,
  lane,
  triggerConfig,
  onTriggerConfigChange,
  savedTierIds,
  triggerWarning,
  triggerLocked = false,
  simpleTriggerNames = false,
  revealWarningsSignal,
  alwaysShowInserts = false,
  onCreateAutomation,
  hideControls = false,
  rightInset = 0,
  enterSignal,
}) => {
  // The shared hook centres the column in [leftInset, width]; a NEGATIVE left
  // inset of the right-hand cover centres it in [0, width - cover] instead.
  // Only the value at mount goes in: the hook re-centres outright (y included)
  // whenever its inset changes, and a pane opening mid-session should pan the
  // flow across, not reset where you'd scrolled to — see the effect below.
  const initialLeftInset = useRef(-rightInset).current;
  const { canvasRef, onInit, size, contentHeightRef, recenter } =
    useCenteredColumn(initialLeftInset);
  // The pane opening or closing: pan across by half the change, on the pane's
  // own curve and duration, so the flow re-centres in the space that's left as
  // the card slides. A shift rather than a re-centre, so a sideways pan of your
  // own is kept.
  const rightInsetRef = useRef(rightInset);
  useEffect(() => {
    const previous = rightInsetRef.current;
    rightInsetRef.current = rightInset;
    const instance = flowRef.current;
    if (previous === rightInset || !instance) {
      return;
    }
    const { x, y, zoom } = instance.getViewport();
    void instance.setViewport(
      { x: x + (previous - rightInset) / 2, y, zoom },
      // PROTO_EASE is an ease-out; cubic ease-out is its close cousin in JS.
      { duration: PANE_SLIDE_MS, ease: (t) => 1 - (1 - t) ** 3 },
    );
  }, [rightInset]);
  // This lane centres a new step on the canvas's true middle rather than the
  // shared centerOn's 40%. Kept here so the shared hook is untouched; it needs
  // the flow instance, so onInit is wrapped to catch it.
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      flowRef.current = instance;
      onInit(instance);
    },
    [onInit],
  );
  const centerAt = useCallback(
    (y: number, duration: number, minShift = 0) => {
      const instance = flowRef.current;
      const el = canvasRef.current;
      if (!instance || !el) {
        return;
      }
      const { zoom, x: currentX, y: currentY } = instance.getViewport();
      const x = Math.round((el.clientWidth - rightInsetRef.current - NODE_WIDTH * zoom) / 2);
      const targetY = el.clientHeight / 2 - y * zoom;
      if (Math.abs(targetY - currentY) < minShift && Math.abs(x - currentX) < minShift) {
        return;
      }
      void instance.setViewport({ x, y: targetY, zoom }, { duration });
    },
    [canvasRef],
  );
  // The node whose form is open, if any.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  // How tall its panel is when grown, in screen pixels — reported by the node.
  const [focusPanelHeight, setFocusPanelHeight] = useState<number | null>(null);
  // Closing (or a different node opening) retires the last panel's height.
  const [prevFocusedId, setPrevFocusedId] = useState(focusedId);
  if (prevFocusedId !== focusedId) {
    setPrevFocusedId(focusedId);
    setFocusPanelHeight(null);
  }
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
  // Switching modes replays a quicker cascade from the top.
  const modeEpoch = useModeEntrance(enterSignal, () =>
    resetColumnToTop(flowRef.current, canvasRef, rightInsetRef.current, recenter),
  );
  const enterDelay = (index: number) =>
    staggering
      ? index * ENTER_STAGGER_MS
      : modeEpoch !== null
        ? index * MODE_STAGGER_MS
        : undefined;
  const enterKey = modeEpoch ?? undefined;

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
  // The nudge that follows the creation sequence: a paid trigger chosen fresh
  // arrives with its tiers unanswered, and the tiers popover opens itself once
  // the sequence has settled — the publisher's next question, asked for them.
  // Armed here, alongside the sequence it trails, so it can only ever fire on
  // the choose-a-trigger flow: changing tiers later, or swapping triggers on a
  // built flow, never replays it.
  // What this lane offers, computed once — both pickers read it, and they have
  // to agree or they aren't the same control.
  const laneOptions = laneTriggerOptions(lane, simpleTriggerNames);
  // The steps this lane can add. Same rule as the triggers: shared code knows
  // every kind, a lane declares which it offers, and phase 1 keeps showing what
  // ships.
  const laneStepOptions = STEP_PICKER_OPTIONS.filter(
    (option) => option.value !== 'update_member' || laneOffersStep(lane, 'update_member'),
  );
  const [fieldRevealPending, setFieldRevealPending] = useState(false);
  // Incremented when the popover should open; the trigger card watches it. A
  // counter rather than a boolean so a second creation flow in one mount (the
  // canvas is keyed by automation, but cheap is cheap) reads as a new event.
  const [fieldRevealSignal, setFieldRevealSignal] = useState(0);
  if (prevUnset !== unset) {
    setPrevUnset(unset);
    setIntroPhase(unset ? null : 'leaving');
    // Any fresh trigger WITH A FIELD arms the nudge, not just an unanswered
    // one: the tier config arrives on the 'all' default, and the popover opening
    // is what puts that default in front of the publisher instead of leaving it
    // answered in a field nobody looked at (see triggerConfigFor). The label
    // trigger arrives genuinely unanswered, so the same beat does more there —
    // it's the only thing that tells you the trigger isn't finished.
    if (!unset && triggerConfig && triggerHasField(triggerConfig)) {
      setFieldRevealPending(true);
    }
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

  // The sequence's true last beat, when one is owed: introPhase returning to
  // null is "the canvas has stopped moving", and the popover opens one beat
  // after that — see FIELD_REVEAL_DELAY_MS for why it trails.
  useEffect(() => {
    if (!fieldRevealPending || introPhase !== null) {
      return;
    }
    const timer = setTimeout(() => {
      setFieldRevealPending(false);
      setFieldRevealSignal((s) => s + 1);
    }, FIELD_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [fieldRevealPending, introPhase]);

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

  const insert = (anchor: InsertActionAnchor, kind: 'email' | 'wait' | 'update_member') => {
    // The framework's helpers for the two it knows, ours for the third — see
    // insertUpdateMemberAction for why it's a copy of their splice rather than a
    // call into it, and asApiDetail for why the detail is cast on the way in.
    const next: ProtoAutomationDetail =
      kind === 'update_member'
        ? insertUpdateMemberAction({ detail: asApiDetail(draft), anchor })
        : kind === 'email'
          ? insertSendEmailAction({ detail: asApiDetail(draft), anchor })
          : insertWaitAction({ detail: asApiDetail(draft), anchor });
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
    const laidOut = layout(columnIds);

    // A card's top and height in the plain column. Heights aren't handed back by
    // the layout, but they're implied by it: the next card's top, less the
    // constant gap, is this one's bottom — and for the last card that bottom is
    // the content's.
    const spanOf = (index: number) => {
      const top = laidOut.ys[index];
      const nextTop = laidOut.ys[index + 1];
      const cardBottom = nextTop === undefined ? laidOut.bottom : nextTop - STEP_GAP;
      return { top, height: cardBottom - top };
    };

    // Room for an open node's panel. The panel grows from the node's centre, so
    // it overhangs the node by the same amount above and below; the cards above
    // move up by that much and the cards below move down, which keeps the usual
    // gap between the panel and its neighbours. The open node itself doesn't
    // move, so the thing you clicked stays where you clicked it.
    //
    // The panel isn't scaled with the canvas, so its height is divided by the
    // zoom to be measured in the column's own units.
    const focusIndex = focusedId ? columnIds.indexOf(focusedId) : -1;
    let room = 0;
    if (focusIndex >= 0 && focusPanelHeight) {
      const zoom = flowRef.current?.getViewport().zoom ?? 1;
      room = Math.max(0, Math.round((focusPanelHeight / zoom - spanOf(focusIndex).height) / 2));
    }
    const shiftOf = (index: number) =>
      focusIndex < 0 || index === focusIndex ? 0 : index < focusIndex ? -room : room;
    const ys = laidOut.ys.map((y, index) => y + shiftOf(index));
    const bottom = laidOut.bottom + shiftOf(columnIds.length - 1);

    // The middle of whichever card the canvas has been asked to centre on.
    const middleOf = (id: string | null): number | null => {
      const index = id ? columnIds.indexOf(id) : -1;
      if (index < 0) {
        return null;
      }
      const { top, height } = spanOf(index);
      return top + shiftOf(index) + height / 2;
    };
    const targetCenter = middleOf(centerStepId);
    const withFocus = (node: Node): Node => ({
      ...node,
      data: {
        ...node.data,
        onFocusChange: (open: boolean) =>
          setFocusedId((current) => (open ? node.id : current === node.id ? null : current)),
        onFocusHeight: (height: number) => {
          if (node.id === focusedId) {
            setFocusPanelHeight(height);
          }
        },
      },
    });

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
            (triggerConfig && graceStepId !== TRIGGER_NODE_ID
              ? unansweredFieldWarning(triggerConfig)
              : undefined)),
        triggerLocked,
        triggerOptions: laneOptions,
        simpleTriggerNames,
        triggerUnset: showOptions,
        introPhase: introPhase ?? undefined,
        enterDelay: enterDelay(0),
        enterKey,
        onRequestTriggerChange: requestTriggerChange,
        fieldRevealSignal,
        savedTierIds,
        onCreateAutomation,
      },
      draggable: false,
      connectable: false,
      selectable: false,
    });
    // Nothing else to draw yet: the trigger node is either asking the question, or
    // resizing around the answer with nothing below it to displace.
    if (triggerOnly) {
      return {
        nodes: built.map(withFocus),
        edges: [] as Edge[],
        contentBottom: bottom,
        centerStepY: targetCenter,
      };
    }
    ordered.forEach((action, i) => {
      // What this email is missing, as the sentence that fixes it. Subject and
      // message are both required to send, so both are watched; the message
      // check earned its way in when the content dialog's simulate switch made
      // an empty body something this screen can actually resolve. "Message" is
      // the field's own name on the card, so the warning points at a thing the
      // reader can see.
      const missingSubject = action.type === 'send_email' && !action.data.email_subject.trim();
      const missingMessage =
        action.type === 'send_email' && !lexicalHasContent(action.data.email_lexical);
      const emailFault =
        missingSubject && missingMessage
          ? 'Add a subject line and a message before this email can be sent.'
          : missingSubject
            ? 'Add a subject line before this email can be sent.'
            : missingMessage
              ? 'Add a message before this email can be sent.'
              : null;
      built.push({
        id: action.id,
        type: 'step',
        position: { x: 0, y: ys[i + 1] },
        data: {
          kind: stepKindOf(action),
          enterDelay: enterDelay(i + 1),
          enterKey,
          isNew: action.id === newStepId,
          title: stepTitle(action),
          subtitle: stepSubtitle(action),
          updateMember: isUpdateMemberAction(action) ? action.data : undefined,
          onUpdateMemberChange: isUpdateMemberAction(action)
            ? (next: UpdateMemberAction['data']) => {
                settleOthers(action.id);
                // No framework helper for this one — see insertUpdateMemberAction
                // for why. Rewriting the action in place keeps flow order, which
                // mapping over the array preserves and a remove/re-add wouldn't.
                onChange({
                  ...draft,
                  actions: draft.actions.map((entry) =>
                    entry.id === action.id ? { ...action, data: next } : entry,
                  ),
                });
              }
            : undefined,
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
          // the trigger's Stripe warning, and the same register: the fix, not
          // the failure. See emailFault above for what counts as blank.
          warning: emailFault && action.id !== graceStepId ? { message: emailFault } : undefined,
          stats: action.type === 'send_email' ? (action.stats ?? ZERO_EMAIL_STATS) : undefined,
          waitHours: action.type === 'wait' ? action.data.wait_hours : undefined,
          onSubjectChange: (subject: string) => {
            settleOthers(action.id);
            onChange(
              updateSendEmailAction({
                detail: asApiDetail(draft),
                actionId: action.id,
                emailSubject: subject,
                emailLexical: action.type === 'send_email' ? action.data.email_lexical : '',
              }),
            );
          },
          onWaitChange: (hours: number) => {
            settleOthers(action.id);
            onChange(
              updateWaitAction({
                detail: asApiDetail(draft),
                actionId: action.id,
                waitHours: hours,
              }),
            );
          },
          onDelete: () => {
            // Deleting ends any grace outright: either the grace card itself just
            // went, or attention was demonstrably on another card.
            setGraceStepId(null);
            onChange(removeAction({ detail: asApiDetail(draft), actionId: action.id }));
          },
          onEditContent: () => {
            settleOthers(action.id);
            setEmailDialogActionId(action.id);
          },
          analyticsOpen: action.id === analyticsActionId,
          emailDialogOpen: action.id === emailDialogActionId,
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
      data: {
        intro: introPhase === 'connecting',
        enterDelay: enterDelay(ordered.length + 1),
        enterKey,
      },
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
          stepOptions: laneStepOptions,
          onPick: (type: ProtoStepPickerType) =>
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
      nodes: built.map(withFocus),
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
    fieldRevealSignal,
    savedTierIds,
    onCreateAutomation,
    focusedId,
    focusPanelHeight,
    emailDialogActionId,
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
      () => centerAt(centerStepY, STEP_CENTER_MS, STEP_CENTER_MIN_SHIFT),
      NEW_STEP_MS,
    );
    return () => clearTimeout(timer);
  }, [centerStepId]);

  // Handed to the viewport hook rather than passed in, because it comes out of the
  // layout below — which needs the hook to have run first.
  contentHeightRef.current = contentBottom;

  const translateExtent = useMemo(
    () => panTranslateExtent(contentBottom, size, -rightInset),
    [contentBottom, size, rightInset],
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
          onInit={handleInit}
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
          {!hideControls && <AutomationCanvasControls style={CANVAS_HUD_INSET} />}
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
                      detail: asApiDetail(draft),
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
