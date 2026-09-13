import '@xyflow/react/dist/style.css';
import React, { useMemo, useState } from 'react';
import { AutomationCanvasControls } from '@/automations/components/canvas/controls';
import { CANVAS_ZOOM_CONFIG } from '@/automations/components/canvas/use-canvas-viewport';
import {
  Background,
  BackgroundVariant,
  type Edge,
  type Node,
  type NodeProps,
  ReactFlow,
} from '@xyflow/react';
import type {
  AutomationDetail,
  AutomationEmailStats,
} from '@tryghost/admin-x-framework/api/automations';
import { Button } from '@tryghost/shade/components';
import { LucideIcon, cn, formatDisplayDate, formatDisplayTime } from '@tryghost/shade/utils';
import type { AutomationRun, RunStepState } from '@/automations/proto/shared/mock';
import {
  DEFAULT_TRIGGER_CONFIG,
  type TriggerConfig,
  triggerIcon,
  triggerLabel,
  triggerReviewLabel,
  triggerSummary,
} from '@/automations/proto/shared/trigger-config';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import {
  CANVAS_HUD_INSET,
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
import { EmailStatsFooter } from './email-analytics';
import { NODE_BODY_PADDING, NodeCard, NodeHeader, type NodeBorder } from './flow-node-shell';
import { EmailPreview } from './email-preview';
import {
  CompletedGlyph,
  ExitedGlyph,
  InProgressGlyph,
} from '@/automations/proto/shared/run-glyphs';
import { exitReasonLabel, toRealClock } from '@/automations/proto/shared/member-runs';

// Shade's own date + time formatters, in the site's timezone — the same pairing
// the post analytics header uses ("12 Jun 2025 at 7:09pm"). This was a raw
// toLocaleString with hand-picked options, which is how a screen ends up
// formatting dates differently from the rest of Ghost.
//
// toRealClock first: fixtures are authored against a fixed clock, and the runs
// list already shifts them, so the canvas has to agree or the same run reads
// "2 hr ago" in the table and shows last month's date here.
const fmtDateTime = (iso: string, timezone: string): string =>
  `${formatDisplayDate(toRealClock(iso), timezone)}, ${formatDisplayTime(toRealClock(iso), timezone)}`;

type NodeKind = StepKind | 'terminal' | 'event';

type FlowNodeData = {
  kind: NodeKind;
  title: string;
  subtitle: string;
  focused: boolean;
  state?: RunStepState;
  // Event nodes only: what kind of between-steps event this card is.
  eventVariant?: 'exited' | 'failed';
  // Email only, review mode: the send went out but delivery failed, so the
  // title says "Sent email" rather than claiming the member received it.
  sentOnly?: boolean;
  // Supporting text ("Opened (1 link)"), the timestamp, and an optional override
  // for the badge's word. Kept as three fields rather than one pre-joined string
  // so the line can style each part differently.
  // stateDetail only surfaces for current steps now (the header's trailing
  // "Resumes Jul 24"); done steps surface stateAt instead. Kept as data for
  // both, since which one the header wants is presentation.
  stateDetail?: string | null;
  stateAt?: string | null;
  stats?: AutomationEmailStats;
  // Trigger node: the one-line config summary (read-only here — configuring
  // happens on the edit canvas), and the member-voice title for review mode.
  //
  // `icon` overrides the step-kind default. The trigger wears the icon of the
  // trigger it is, so the card doesn't change its mark when this canvas crossfades
  // with the edit one. A run state still wins it — a chip that reports where the
  // member got to is more use than one repeating what the card already says.
  icon?: React.ElementType;
  summary?: string;
  reviewLabel?: string;
  // Email node: opens the right-hand analytics sheet, and goes blue while that
  // sheet is reporting on it.
  onOpenAnalytics?: () => void;
  analyticsOpen?: boolean;
};

// Review state lives in the header now, not a footer. The leading chip swaps
// its step-kind icon for the run-state glyph in the badge treatment — pastel
// colour/20 fill, the darker -600 foreground in light (plain alias in dark) —
// and the step's timestamp sits at the header's far right.
//
// Only the two states a step can actually BE in. Exits and failures aren't step
// states any more — the step itself completed (the email was received; the send
// went out) — they're events between steps, rendered as their own card below.
// Skipped/upcoming cards keep the neutral chip: nothing happened, so there's no
// state to paint.
const STATE_CHIP: Partial<Record<RunStepState, { className: string; glyph: React.ElementType }>> = {
  done: { className: 'bg-green/20 text-green-600 dark:text-green', glyph: CompletedGlyph },
  current: { className: 'bg-blue/20 text-blue-600 dark:text-blue', glyph: InProgressGlyph },
};

// The only non-visual carrier of run state on this canvas.
//
// State reaches a sighted reader four ways: the chip's glyph, the card's border,
// its opacity, and — until the titles went past-tense throughout — the tense of
// the title itself. The first three are purely visual, and now that a reached
// step and an unreached one can render the identical words ("Received email"),
// the tense isn't telling them apart either. Without this line a screen reader
// gets a column of cards with no way to hear where the member actually is.
//
// Read after the title, so a card announces as "Received email, not reached".
const STATE_A11Y: Record<RunStepState, string> = {
  done: 'Done',
  current: 'In progress',
  skipped: 'Not reached',
  upcoming: 'Not reached',
};

const StateForScreenReaders: React.FC<{ focused: boolean; state?: RunStepState }> = ({
  focused,
  state,
}) => (focused && state ? <span className="sr-only">{STATE_A11Y[state]}</span> : null);

// CircleAlert wrapped to the ElementType shape the chip slot takes.
function FailedGlyph({ className }: { className?: string }) {
  return <LucideIcon.CircleAlert className={cn('size-4 shrink-0', className)} strokeWidth={2} />;
}

const FlowStepNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as FlowNodeData;
  const done = d.focused && d.state === 'done';
  const current = d.focused && d.state === 'current';
  const muted = d.focused && (d.state === 'skipped' || d.state === 'upcoming');
  const isEmail = d.kind === 'email';

  // The between-steps event: where the run ended, as its own card in the flow
  // rather than a recolouring of the step before it. Shaped like the wait card
  // (header only), because it narrates one fact. A member event (unsubscribed,
  // upgraded) reads in the exit treatment; a system fault (a bounce coming back
  // from the mail provider after a successful send) reads in the failure one —
  // the step above keeps its completed state either way, because it did happen.
  if (d.kind === 'event') {
    const failedEvent = d.eventVariant === 'failed';
    return (
      <NodeCard border={failedEvent ? 'failed' : 'exited'}>
        <NodeHeader
          chipClassName={
            failedEvent ? 'bg-red/20 text-red-600 dark:text-red' : 'bg-muted text-muted-foreground'
          }
          icon={failedEvent ? FailedGlyph : ExitedGlyph}
          meta={d.stateAt}
          title={d.title}
        />
      </NodeCard>
    );
  }

  // Where the flow ends. A header-only card, the same shape as the event card
  // above and as the edit canvas's Exit node — this was a rounded pill, which
  // made the last thing in the column the one thing in the column that wasn't a
  // card. The two canvases crossfade at the same position, so selecting a member
  // visibly morphed a card into a pill.
  //
  // With no run in focus it's simply the end of the flow. With one, it reports
  // that member's outcome and takes the run-state chip and border every other
  // card takes — so the same card answers "where does this end" and "how did it
  // end for them" without changing shape between the two.
  if (d.kind === 'terminal') {
    const chip = done ? STATE_CHIP.done : current ? STATE_CHIP.current : undefined;
    return (
      <NodeCard border={current ? 'current' : done ? 'done' : 'default'} muted={muted}>
        <NodeHeader
          chipClassName={chip?.className}
          icon={chip?.glyph ?? LucideIcon.LogOut}
          title={d.title}
        />
        <StateForScreenReaders focused={d.focused} state={d.state} />
      </NodeCard>
    );
  }

  // Analytics wins the border: it only ever opens with no run in focus, so it
  // can't be masking a run state here.
  const border: NodeBorder = d.analyticsOpen
    ? 'selected'
    : current
      ? 'current'
      : done
        ? 'done'
        : 'default';
  // The chip stays the step-kind icon in every state. Run state was tried here
  // and moved: it took the position that identifies a card at a distance, and
  // the flow stopped being scannable by shape. It now leads the detail line at
  // the foot of the card, next to the words it qualifies.

  // Single-line header (no overline) matching edit mode's one-line title.
  //
  // Reviewing a run, every title narrates what this member did, and it does so in
  // the PAST TENSE throughout — including on cards the run hasn't reached, which
  // are dimmed and carry the neutral chip. Only a step they're standing on is
  // present tense ("Waiting 3 days", "Sending email"), because that one genuinely
  // is happening.
  //
  // Tense used to track position instead: "Received email" above them, "Receive
  // email" below. That made one node three different words depending on where the
  // member happened to be, so a run couldn't be scanned against the flow it came
  // from — and it was saying a third time what the chip, the border and the
  // dimming already say. State is state; the title is what the step IS.
  //
  // Both exceptions to the member's voice are the same exception: the card only
  // says "Received" once receipt is established.
  //
  //   Sending email  the send is in flight — submitted, nothing back from the
  //                  provider yet. Ghost's voice, because nobody has received
  //                  anything. This state is real but brief: a run advances on
  //                  submission rather than holding for a delivery webhook, so the
  //                  frontier only sits on a send during the send itself (or in a
  //                  flow that opens with one, or has two in a row). The runs list
  //                  says "Sending email 2" for the same state — same word, same
  //                  subject.
  //   Sent email     the send completed and delivery failed. Ghost's voice for the
  //                  same reason; the failure event card below carries what came
  //                  back.
  //
  // Without a run in focus the titles describe the flow you built ("Send email").
  const label = isEmail
    ? !d.focused
      ? 'Send email'
      : current
        ? 'Sending email'
        : d.sentOnly
          ? 'Sent email'
          : 'Received email'
    : d.kind === 'wait'
      ? `${current ? 'Waiting' : 'Waited'} ${d.subtitle}`
      : d.focused
        ? (d.reviewLabel ?? d.subtitle)
        : d.subtitle;

  const chip = d.focused && d.state ? STATE_CHIP[d.state] : undefined;
  // Far right of the header: when the step happened, when it will ("Resumes
  // Jul 24" on a current step), or nothing for steps with no time to name.
  const meta = d.focused ? (d.stateAt ?? (current ? d.stateDetail : null)) : null;
  return (
    <NodeCard border={border} muted={muted}>
      <NodeHeader
        action={
          !d.focused && d.stats ? (
            // Matches the edit canvas: analytics open from a named control
            // in the header, not from a hover state over the numbers.
            <Button
              aria-label="View email analytics"
              className="nodrag nopan"
              size="icon"
              type="button"
              variant="ghost"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                d.onOpenAnalytics?.();
              }}
            >
              <LucideIcon.ChartNoAxesColumn />
            </Button>
          ) : undefined
        }
        chipClassName={chip?.className}
        icon={chip?.glyph ?? d.icon ?? stepKindIcon[d.kind]}
        meta={meta}
        title={label}
      />
      <StateForScreenReaders focused={d.focused} state={d.state} />
      {isEmail && (
        <div className={NODE_BODY_PADDING}>
          <EmailPreview subject={d.subtitle || 'Untitled'} />
          {!d.focused && d.stats && (
            <div className="mt-3">
              <EmailStatsFooter divider={false} stats={d.stats} />
            </div>
          )}
        </div>
      )}
      {/* Trigger: what this automation listens for, and how many criteria
                    end it. Read-only on this canvas. */}
      {d.kind === 'trigger' && !d.focused && d.summary && (
        <div className={cn(NODE_BODY_PADDING, 'text-sm text-muted-foreground')}>{d.summary}</div>
      )}
    </NodeCard>
  );
};

const nodeTypes = { flowStep: FlowStepNode };

// Which node states count as "the member got here", for edge opacity. 'exited'
// and 'failed' belong with them: the step is one the member travelled to, so the
// line into it is a path taken — a different outcome, not a shorter journey. Only
// 'skipped' and 'upcoming' fade.
const reachedStates: ReadonlySet<RunStepState> = new Set(['done', 'current']);

interface FlowCanvasProps {
  automation: AutomationDetail;
  selectedRun: AutomationRun | null;
  // Space to reserve on the left for a floating overlay (the performance card), so
  // the flow centres beside it and can't be panned underneath. 0 = full width.
  leftInset?: number;
  // Read-only here — the trigger is configured on the edit canvas.
  triggerConfig?: TriggerConfig;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  automation,
  selectedRun,
  leftInset = 0,
  triggerConfig = DEFAULT_TRIGGER_CONFIG,
}) => {
  const { canvasRef, onInit, size } = useCenteredColumn(leftInset);
  // Same source the shipping analytics header reads; falls back to Etc/UTC when
  // the setting isn't loaded.
  const { data: settingsData } = useBrowseSettings();
  const siteTimezone = getSiteTimezone(settingsData?.settings ?? []);
  const focused = Boolean(selectedRun);
  // Which email the right-hand analytics sheet is reporting on.
  const [analyticsActionId, setAnalyticsActionId] = useState<string | null>(null);
  const analyticsAction = analyticsActionId
    ? orderActions(automation).find((a) => a.id === analyticsActionId)
    : undefined;
  const sheetEmail: SheetEmail | null =
    analyticsAction?.type === 'send_email' && analyticsAction.stats
      ? {
          actionId: analyticsAction.id,
          subject: analyticsAction.data.email_subject || 'Untitled',
          stats: analyticsAction.stats,
        }
      : null;

  // Card heights are read back from the render — see useMeasuredColumn.
  const { onNodesChange, layout } = useMeasuredColumn();

  const { nodes, edges, contentBottom } = useMemo(() => {
    const ordered = orderActions(automation);
    const stepByAction = new Map((selectedRun?.steps ?? []).map((s) => [s.action_id, s]));
    // Where an exited run stopped: its last completed step. The run itself
    // carries the outcome, so this is derived rather than string-matched off
    // the step's detail text.
    const exitedAtActionId =
      focused && selectedRun?.status === 'exited_early'
        ? ([...selectedRun.steps].reverse().find((step) => step.state === 'done')?.action_id ??
          null)
        : null;

    // Collect node data in flow order first, so we can position each from its
    // rendered height (which footer, if any, it carries) for even visible gaps.
    const descriptors: { id: string; data: FlowNodeData }[] = [];

    // Trigger — always "done" once enrolled.
    descriptors.push({
      id: '__trigger__',
      data: {
        kind: 'trigger',
        title: 'Trigger',
        icon: triggerIcon(triggerConfig),
        subtitle: triggerLabel(triggerConfig),
        summary: triggerSummary(triggerConfig),
        reviewLabel: triggerReviewLabel(triggerConfig ?? DEFAULT_TRIGGER_CONFIG),
        focused,
        state: focused ? 'done' : undefined,
        stateDetail: null,
        stateAt: selectedRun ? fmtDateTime(selectedRun.enrolled_at, siteTimezone) : null,
      },
    });

    ordered.forEach((action) => {
      const step = stepByAction.get(action.id);
      const isEmail = action.type === 'send_email';
      const stats = action.type === 'send_email' ? action.stats : undefined;
      let stateDetail: string | null = null;
      let stateAt: string | null = null;
      if (focused) {
        stateDetail = step?.detail ?? null;
        // Timestamp only on steps that have actually happened. An active wait
        // already names the date it resumes, and stamping it with the moment
        // it started put two dates on one line for the reader to work out
        // which was which.
        if (step?.state === 'done' && step.occurred_at) {
          stateAt = fmtDateTime(step.occurred_at, siteTimezone);
        }
      }
      descriptors.push({
        id: action.id,
        data: {
          kind: isEmail ? 'email' : 'wait',
          title: isEmail ? 'Send email' : 'Wait',
          subtitle: isEmail
            ? action.data.email_subject || 'Untitled'
            : formatWait(action.data.wait_hours),
          focused,
          // The step keeps its own (raw) state even where the run ended —
          // the email WAS received, the send DID go out. What ended the run
          // is the event node inserted after it, not a repaint of this card.
          state: step?.state,
          sentOnly: Boolean(step?.failed),
          stateDetail,
          stateAt,
          stats,
          onOpenAnalytics: () => setAnalyticsActionId(action.id),
          analyticsOpen: analyticsActionId === action.id,
        },
      });

      // The between-steps event card, after the step the run ended at. A
      // failed step's event names what the provider reported (the step's
      // detail); a member exit names the exit reason. Timestamped with the
      // step it follows — the closest moment the data has for it.
      if (action.id === exitedAtActionId && selectedRun) {
        const failedExit = Boolean(step?.failed);
        descriptors.push({
          id: '__exit__',
          data: {
            kind: 'event',
            // A failed send names what actually broke ("Member inbox is
            // full") when the step knows; otherwise the run's own reason,
            // read through the shared label map so it reads the same here as
            // everywhere else.
            title: failedExit
              ? (step?.detail ?? exitReasonLabel('failed'))
              : selectedRun.exit_reason
                ? exitReasonLabel(selectedRun.exit_reason)
                : 'Exited early',
            subtitle: '',
            focused,
            // 'done' so the edge INTO this card reads as path travelled.
            state: 'done',
            eventVariant: failedExit ? 'failed' : 'exited',
            stateAt: step?.occurred_at ? fmtDateTime(step.occurred_at, siteTimezone) : null,
          },
        });
      }
    });

    // Terminal marker.
    // Unfocused it names the flow's end, matching the edit canvas's Exit node —
    // "Complete" with nobody in focus was reporting an outcome for a run that
    // isn't being looked at.
    //
    // In focus it's "Completed", and that's the only thing it ever says. It used
    // to read "Exited early" for a run that ended — which the event card directly
    // above it had already said, in more detail and by name ("Unsubscribed"). The
    // terminal is simply the card the run didn't reach, dimmed like every other
    // card the run didn't reach, and the event card owns the outcome.
    const terminalLabel = focused ? 'Completed' : 'Exit automation';
    const terminalState: FlowNodeData['state'] = !focused
      ? undefined
      : selectedRun?.status === 'completed'
        ? 'done'
        : selectedRun?.status === 'exited_early'
          ? 'skipped'
          : 'upcoming';
    descriptors.push({
      id: '__terminal__',
      data: {
        kind: 'terminal',
        title: terminalLabel,
        subtitle: '',
        focused,
        state: terminalState,
      },
    });

    // Measured, not derived: what a card carries — an email preview, the
    // trigger's config summary, a stats footer, the exit event's reason line —
    // no longer has to be mirrored in a height function that goes stale every
    // time one of those changes shape.
    const { ys, bottom } = layout(descriptors.map((d) => d.id));
    const built: Node[] = descriptors.map((descriptor, i) => ({
      id: descriptor.id,
      type: 'flowStep',
      position: { x: 0, y: ys[i] },
      data: descriptor.data,
      draggable: false,
      connectable: false,
      selectable: false,
    }));

    // Edges follow the node order.
    const ids = built.map((n) => n.id);
    const builtEdges: Edge[] = [];
    for (let i = 0; i < ids.length - 1; i++) {
      const targetData = built[i + 1].data as unknown as FlowNodeData;
      const targetReached =
        focused && targetData.state ? reachedStates.has(targetData.state) : false;
      builtEdges.push({
        id: `${ids[i]}->${ids[i + 1]}`,
        source: ids[i],
        target: ids[i + 1],
        type: 'smoothstep',
        style: {
          // One grey the whole way down, in every state. Reviewing a run,
          // the connectors used to turn green behind the member as far as
          // they'd got — which put the progress story in two places at once
          // (the cards already carry it) and lit up half the canvas to say
          // something the card borders and check marks say more precisely.
          stroke: EDGE_STROKE,
          strokeWidth: 1,
          // Reached vs not is opacity on a solid line, not a dash pattern.
          // A dash is a second kind of mark to learn; fading is just less of
          // the same one, so the path a member actually travelled reads as
          // present and the rest as pending without changing what the line is.
          strokeOpacity: focused && !targetReached ? 0.4 : 1,
        },
      });
    }

    return { nodes: built, edges: builtEdges, contentBottom: bottom };
  }, [automation, selectedRun, focused, triggerConfig, analyticsActionId, layout]);

  const translateExtent = useMemo(
    () => panTranslateExtent(contentBottom, size, leftInset),
    [contentBottom, size, leftInset],
  );

  return (
    // relative: the analytics sheet slides in over this region.
    <div className="relative size-full">
      <div ref={canvasRef} className="size-full">
        <ReactFlow
          edges={edges}
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
    </div>
  );
};

export default FlowCanvas;
