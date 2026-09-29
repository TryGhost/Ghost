import '@xyflow/react/dist/style.css';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AutomationCanvasControls } from '@/automations/components/canvas/controls';
import { CANVAS_ZOOM_CONFIG } from '@/automations/components/canvas/use-canvas-viewport';
import {
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  type ReactFlowInstance,
} from '@xyflow/react';
import { LucideIcon, cn, formatDisplayDate, formatDisplayTime } from '@tryghost/shade/utils';
import type { AutomationRun, RunStepState } from '@/automations/proto/shared/mock';
import {
  type ProtoAction,
  type ProtoAutomationDetail,
  customFieldName,
  isUpdateMemberAction,
} from '@/automations/proto/shared/update-member';
import {
  DEFAULT_TRIGGER_CONFIG,
  type TriggerConfig,
  hasTierFilter,
  tierNames,
  triggerIcon,
  triggerReviewLabel,
} from '@/automations/proto/shared/trigger-config';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import {
  CANVAS_HUD_INSET,
  EDGE_STROKE,
  HIDDEN_HANDLE_STYLE,
  type StepKind,
  formatWait,
  lexicalHasContent,
  orderActions,
  panTranslateExtent,
  stepKindIcon,
  stepKindOf,
  useCenteredColumn,
} from '@/automations/proto/canvas/flow-utils';
import {
  CompletedGlyph,
  ExitedGlyph,
  InProgressGlyph,
} from '@/automations/proto/shared/run-glyphs';
import { exitReasonLabel, toRealClock } from '@/automations/proto/shared/member-runs';
import { useLabels } from '@/automations/proto/shared/labels';
import { useSegments } from '@/automations/proto/shared/segments';
import {
  COLUMN_WRAPPER,
  ENTER_CLASS,
  EmailThumbnail,
  NODE_CARD_WIDTH,
  PANE_SLIDE_MS,
  StepNodeFace,
} from './edit-canvas';
import { useMeasuredColumn } from './measured-column';
import { MODE_STAGGER_MS, resetColumnToTop, useModeEntrance } from './mode-entrance';

// ---------------------------------------------------------------------------
// The member-run review canvas, forked for the right-panel lane.
//
// The other lanes review a run on the shared canvas/flow-canvas, which phase 1
// and 2 build from — so it stays as it is, and this lane gets its own copy. The
// point of the copy is that a run reads on the SAME nodes the flow was built
// with: the light rows and the email preview come straight from this lane's edit
// canvas, so selecting a member changes what the nodes say, not what they are.
//
// What a run adds to a light node, and nothing more:
//   - The step's icon swaps for the run glyph (done / in progress), in its colour.
//     Unreached steps keep their kind icon and dim.
//   - A muted line under the title: when it happened, or when it resumes.
//   - Titles narrate the member's run in the past tense, over the edit canvas's
//     sentences — "Received Welcome to the club", "Waited 3 days".
// No coloured borders; the edit canvas's quiet card holds in every state.
//
// Where a run ended isn't a step, so it isn't drawn as one: it's a pill that
// hugs its words, spaced in the column after the step it followed.
//
// No email stats and no analytics sheet here — those stay off the node for now.
// ---------------------------------------------------------------------------

const fmtDateTime = (iso: string, timezone: string): string =>
  `${formatDisplayDate(toRealClock(iso), timezone)}, ${formatDisplayTime(toRealClock(iso), timezone)}`;

type RunNodeKind = StepKind | 'terminal';

type RunNodeData = {
  kind: RunNodeKind;
  title: string;
  icon: React.ElementType;
  focused: boolean;
  state?: RunStepState;
  // The muted line under the title — a timestamp, or "Resumes Jul 24".
  stateLine?: string | null;
  emailHasContent?: boolean;
  enterDelay?: number;
  enterKey?: number;
};

type EventNodeData = {
  title: string;
  variant: 'exited' | 'failed';
  // When they left — the step it follows is the closest moment the data has.
  at?: string | null;
  enterDelay?: number;
  enterKey?: number;
};

// The run glyphs, coloured, in the shape StepNodeFace's icon slot takes. The
// face gives its icon text-muted-foreground; cn merges this colour over it.
const DoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <CompletedGlyph className={cn(className, 'text-green-600 dark:text-green')} />
);
const CurrentIcon: React.FC<{ className?: string }> = ({ className }) => (
  <InProgressGlyph className={cn(className, 'text-blue-600 dark:text-blue')} />
);

const STATE_ICON: Partial<Record<RunStepState, React.ElementType>> = {
  done: DoneIcon,
  current: CurrentIcon,
};

// The only non-visual carrier of run state here — the glyph and the dimming are
// both visual. Read after the title.
const STATE_A11Y: Record<RunStepState, string> = {
  done: 'Done',
  current: 'In progress',
  skipped: 'Not reached',
  upcoming: 'Not reached',
};

// The mode-switch cascade on a card's wrapper — see mode-entrance.
const entrance = (d: { enterDelay?: number; enterKey?: number }) => ({
  key: d.enterKey,
  className: d.enterDelay !== undefined ? ENTER_CLASS : undefined,
  style: d.enterDelay === undefined ? undefined : { animationDelay: `${d.enterDelay}ms` },
});

const isUnreached = (d: RunNodeData) =>
  d.focused && (d.state === 'skipped' || d.state === 'upcoming');

const RunStepNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as RunNodeData;
  const isEmail = d.kind === 'email';
  const icon = (d.focused && d.state && STATE_ICON[d.state]) || d.icon;
  const face = (
    <StepNodeFace icon={icon} subtitle={d.stateLine ?? undefined} title={d.title} warning={false} />
  );
  const enter = entrance(d);
  return (
    <div key={enter.key} className={cn(COLUMN_WRAPPER, enter.className)} style={enter.style}>
      <Handle position={Position.Top} style={HIDDEN_HANDLE_STYLE} type="target" />
      <div
        className={cn(
          // The flow's end hugs its content, as it does on the edit canvas.
          d.kind !== 'terminal' && NODE_CARD_WIDTH,
          'flex rounded-xl border border-border-default bg-surface-elevated transition-opacity',
          isEmail ? 'flex-col overflow-hidden' : 'items-center gap-3 px-6 py-5',
          isUnreached(d) && 'opacity-35',
        )}
      >
        {isEmail ? (
          <>
            <span className="flex items-center gap-3 border-b border-border-default px-6 py-5">
              {face}
            </span>
            <EmailThumbnail d={{ emailHasContent: d.emailHasContent }} />
          </>
        ) : (
          face
        )}
        {d.focused && d.state && <span className="sr-only">{STATE_A11Y[d.state]}</span>}
      </div>
      <Handle position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} type="source" />
    </div>
  );
};

// Where the run ended: a pill in the column, not a card. It takes a node's
// width, padding (px-6 py-5) and place in the spacing, and stays round — the
// shape is what reads it as an event on the path rather than one more step.
// The connector runs through it via hidden handles. Failure is red, a member's
// own exit is muted, the same split the runs table makes.
// The exit glyphs in StepNodeFace's icon-slot shape; cn merges the colour over
// the face's text-muted-foreground.
const FailedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideIcon.CircleAlert className={cn(className, 'text-state-danger')} strokeWidth={2} />
);
const ExitedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <ExitedGlyph className={className} />
);

const RunEventNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as EventNodeData;
  const failed = d.variant === 'failed';
  const enter = entrance(d);
  return (
    <div
      key={enter.key}
      className={cn(COLUMN_WRAPPER, 'pointer-events-none', enter.className)}
      style={enter.style}
    >
      <Handle position={Position.Top} style={HIDDEN_HANDLE_STYLE} type="target" />
      {/* The nodes' own face — icon, title, and the timestamp as a muted line
          under it — so the pill says "when" the same way every step does. */}
      <span
        className={cn(
          NODE_CARD_WIDTH,
          'flex items-center gap-3 rounded-full border border-border-default bg-surface-elevated px-6 py-5',
        )}
      >
        <StepNodeFace
          icon={failed ? FailedIcon : ExitedIcon}
          subtitle={d.at ?? undefined}
          title={d.title}
          warning={false}
        />
      </span>
      <Handle position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} type="source" />
    </div>
  );
};

const nodeTypes = { runStep: RunStepNode, runEvent: RunEventNode };

// Which states count as "the member got here", for edge opacity.
const reachedStates: ReadonlySet<RunStepState> = new Set(['done', 'current']);

// The trigger, as what this member did — the edit canvas's sentence ("When
// someone subscribes to Gold") in the run's past tense ("Subscribed to Gold").
const runTriggerTitle = (
  config: TriggerConfig,
  labels: { id: string; name: string }[],
  segments: { id: string; name: string }[],
): string => {
  switch (config.type) {
    case 'paid_subscription_starts': {
      const tiers = hasTierFilter(config) ? tierNames(config.tierIds) : [];
      return tiers.length === 1 ? `Subscribed to ${tiers[0]}` : 'Started paid subscription';
    }
    case 'label_added': {
      const label = labels.find((entry) => entry.id === config.labelId)?.name;
      return label ? `${label} label added` : 'Label added';
    }
    case 'segment_entered': {
      const segment = segments.find((entry) => entry.id === config.segmentId)?.name;
      return segment ? `Entered ${segment}` : 'Entered segment';
    }
    default:
      return triggerReviewLabel(config);
  }
};

// A step, as what happened to this member. Past tense throughout — including on
// steps the run hasn't reached, which dim instead — except the one they're
// standing on, which genuinely is happening. An email names its subject: the
// edit canvas's "Send Welcome to the club" becomes "Received Welcome to the
// club". "Sending" / "Sent" are Ghost's voice, for a send in flight and a send
// that went out and bounced — nobody has received anything in either.
const runStepTitle = (
  action: ProtoAction,
  state: RunStepState | undefined,
  failed: boolean,
  labels: { id: string; name: string }[],
): string => {
  const current = state === 'current';
  if (isUpdateMemberAction(action)) {
    const data = action.data;
    if (data.operation === 'unsubscribe') {
      return 'Unsubscribed from all emails';
    }
    if (data.operation === 'label') {
      const verb = data.label_mode === 'add' ? 'Added' : 'Removed';
      const label = labels.find((entry) => entry.id === data.label_id)?.name;
      return label ? `${verb} ${label} label` : `${verb} a label`;
    }
    const field = customFieldName(data.field_id);
    const value = data.field_value.trim();
    if (!field) {
      return 'Updated a field';
    }
    return value ? `Set ${field} to ${value}` : `Set ${field}`;
  }
  if (action.type === 'wait') {
    return `${current ? 'Waiting' : 'Waited'} ${formatWait(action.data.wait_hours)}`;
  }
  const subject = action.data.email_subject?.trim() || 'email';
  return `${current ? 'Sending' : failed ? 'Sent' : 'Received'} ${subject}`;
};

interface RunCanvasProps {
  automation: ProtoAutomationDetail;
  selectedRun: AutomationRun | null;
  triggerConfig?: TriggerConfig;
  // The pane card's cover on the right — the flow centres in what's left, and
  // pans across as the card slides. Same contract as the lane's edit canvas.
  rightInset?: number;
  // Bumped on switching into or out of review — see mode-entrance.
  enterSignal?: number;
}

export const RunCanvas: React.FC<RunCanvasProps> = ({
  automation,
  selectedRun,
  triggerConfig = DEFAULT_TRIGGER_CONFIG,
  rightInset = 0,
  enterSignal,
}) => {
  // Centring and the pane pan, as the edit canvas does them — see its notes.
  const initialLeftInset = useRef(-rightInset).current;
  const { canvasRef, onInit, size, contentHeightRef, recenter } =
    useCenteredColumn(initialLeftInset);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      flowRef.current = instance;
      onInit(instance);
    },
    [onInit],
  );
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
      { duration: PANE_SLIDE_MS, ease: (t) => 1 - (1 - t) ** 3 },
    );
  }, [rightInset]);

  const run = selectedRun;

  // Entering review: back to the top, cards cascading in. Moving between members
  // doesn't bump the signal, so the nodes just update.
  const modeEpoch = useModeEntrance(enterSignal, () =>
    resetColumnToTop(flowRef.current, canvasRef, rightInsetRef.current, recenter),
  );
  const focused = Boolean(run);

  const { data: settingsData } = useBrowseSettings();
  const siteTimezone = getSiteTimezone(settingsData?.settings ?? []);
  const labels = useLabels();
  const segments = useSegments();
  const { onNodesChange, layout } = useMeasuredColumn();

  const { nodes, edges, contentBottom } = useMemo(() => {
    const ordered = orderActions(automation);
    const stepByAction = new Map((run?.steps ?? []).map((s) => [s.action_id, s]));
    // Where an exited run stopped: its last completed step.
    const exitedAtActionId =
      run?.status === 'exited_early'
        ? ([...run.steps].reverse().find((step) => step.state === 'done')?.action_id ?? null)
        : null;

    const descriptors: { id: string; data: RunNodeData }[] = [
      {
        id: '__trigger__',
        data: {
          kind: 'trigger',
          title: runTriggerTitle(triggerConfig, labels, segments),
          icon: triggerIcon(triggerConfig),
          focused,
          state: focused ? 'done' : undefined,
          stateLine: run ? fmtDateTime(run.enrolled_at, siteTimezone) : null,
        },
      },
    ];

    let event: { afterIndex: number; data: EventNodeData } | null = null;

    ordered.forEach((action) => {
      const step = stepByAction.get(action.id);
      const kind = stepKindOf(action);
      // Timestamp only on steps that have happened; a current wait names when
      // it resumes instead.
      const stateLine =
        step?.state === 'done' && step.occurred_at
          ? fmtDateTime(step.occurred_at, siteTimezone)
          : step?.state === 'current'
            ? step.detail
            : null;
      descriptors.push({
        id: action.id,
        data: {
          kind,
          title: runStepTitle(action, step?.state, Boolean(step?.failed), labels),
          icon: stepKindIcon[kind],
          focused,
          state: step?.state,
          stateLine,
          emailHasContent:
            action.type === 'send_email' ? lexicalHasContent(action.data.email_lexical) : undefined,
        },
      });

      if (action.id === exitedAtActionId && run) {
        const failedExit = Boolean(step?.failed);
        event = {
          afterIndex: descriptors.length - 1,
          data: {
            variant: failedExit ? 'failed' : 'exited',
            title: failedExit
              ? (step?.detail ?? exitReasonLabel('failed'))
              : run.exit_reason
                ? exitReasonLabel(run.exit_reason)
                : 'Exited early',
            at: step?.occurred_at ? fmtDateTime(step.occurred_at, siteTimezone) : null,
          },
        };
      }
    });

    // The end of the flow. "Completed" for a member who got here; otherwise it's
    // just the card their run didn't reach — the pill above says why.
    const completed = run?.status === 'completed';
    descriptors.push({
      id: '__terminal__',
      data: {
        kind: 'terminal',
        title: focused ? 'Completed' : 'Exit automation',
        icon: LucideIcon.LogOut,
        focused,
        state: !focused
          ? undefined
          : completed
            ? 'done'
            : run?.status === 'exited_early'
              ? 'skipped'
              : 'upcoming',
      },
    });

    // The pill joins the column after the step the run ended at, measured and
    // spaced like any node — the full step gap above and below — rather than
    // squeezed into the gap on the connector. That step is never last (the
    // terminal follows), so there's always a line to carry on below it.
    const exitEvent = event as { afterIndex: number; data: EventNodeData } | null;
    type ColumnItem =
      | { id: string; type: 'runStep'; data: RunNodeData }
      | { id: string; type: 'runEvent'; data: EventNodeData };
    const items: ColumnItem[] = descriptors.map((d) => ({ ...d, type: 'runStep' as const }));
    if (exitEvent) {
      items.splice(exitEvent.afterIndex + 1, 0, {
        id: '__exit__',
        type: 'runEvent',
        data: exitEvent.data,
      });
    }

    const { ys, bottom } = layout(items.map((item) => item.id));
    const built: Node[] = items.map((item, i) => ({
      id: item.id,
      type: item.type,
      position: { x: 0, y: ys[i] },
      data:
        modeEpoch === null
          ? item.data
          : { ...item.data, enterDelay: i * MODE_STAGGER_MS, enterKey: modeEpoch },
      draggable: false,
      connectable: false,
      selectable: false,
    }));

    // The line runs through the pill: into it solid, as path the member took to
    // where they left, and out of it faded, like every line past the run's end.
    const builtEdges: Edge[] = [];
    for (let i = 0; i < items.length - 1; i++) {
      const target = items[i + 1];
      const reached =
        target.type === 'runEvent' ||
        (focused && target.data.state ? reachedStates.has(target.data.state) : false);
      builtEdges.push({
        id: `${items[i].id}->${target.id}`,
        source: items[i].id,
        target: target.id,
        type: 'smoothstep',
        style: {
          stroke: EDGE_STROKE,
          strokeWidth: 1,
          strokeOpacity: focused && !reached ? 0.4 : 1,
        },
      });
    }

    return { nodes: built, edges: builtEdges, contentBottom: bottom };
  }, [automation, run, focused, triggerConfig, layout, labels, segments, siteTimezone, modeEpoch]);
  contentHeightRef.current = contentBottom;

  const translateExtent = useMemo(
    () => panTranslateExtent(contentBottom, size, -rightInset),
    [contentBottom, size, rightInset],
  );

  return (
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
        onInit={handleInit}
        onNodesChange={onNodesChange}
      >
        {/* No dot grid and (above) no card shadows: reviewing a run is reading,
            not building, so the canvas drops the edit view's working surface —
            flat cards on a plain fill — and the change of mode shows at a glance.
            The fill is the edit canvas's own, from the region (canvasTheme): a
            darker review fill was tried and flashed on the switch — the whole
            surface changing colour in one frame while the cards were still
            fading in. The dots going is enough. */}
        <AutomationCanvasControls style={CANVAS_HUD_INSET} />
      </ReactFlow>
    </div>
  );
};

export default RunCanvas;
