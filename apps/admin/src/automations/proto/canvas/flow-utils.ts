import {
  type CSSProperties,
  type ElementType,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  AutomationAction,
  AutomationDetail,
} from '@tryghost/admin-x-framework/api/automations';
import type { NodeChange, ReactFlowInstance } from '@xyflow/react';
import { LucideIcon } from '@tryghost/shade/utils';

// Shared flow helpers + scaffolding, kept out of the canvas component files so
// those can export only components (react-refresh/only-export-components). Both
// the read-only (flow-canvas) and editable (edit-canvas) canvases build on these.

// Edge stroke + canvas theme vars, shared here (rather than defined per-canvas)
// so the two canvases can't drift back apart the way flow-canvas's did before.
export const EDGE_STROKE = 'var(--xy-edge-stroke)';

// Invisible AND zero-size, matching the production canvas's HiddenHandle
// (components/canvas/nodes.tsx). opacity alone left the default 6px handle in
// place, and React Flow anchors an edge at the handle's outer face — 3px past
// the card either way, which read as a small gap between every connector and
// its card. At zero size the anchor is the card edge itself.
export const HIDDEN_HANDLE_STYLE: CSSProperties = {
  background: 'transparent',
  border: 'none',
  height: 0,
  minHeight: 0,
  minWidth: 0,
  opacity: 0,
  width: 0,
};
// Canvas fill, taken verbatim from the shipping automation-canvas
// (automations/components/canvas/automation-canvas.tsx): grey-50 in light, and
// --background in dark, which is the stop below the cards' --surface-elevated.
// The proto had drifted to --background in both modes (white cards on a white
// page in light) and then to --surface-page (pure black in dark). Production had
// already solved this; there's nothing here to invent.
//
// --- Canvas palette --------------------------------------------------------
//
// Every colour the canvas paints, per release, in one table. Edit here and
// nothing else needs touching.
//
// These are set on the region that CONTAINS the flow, not on the flow itself.
// React Flow only ever declares *-default variants on .react-flow and reads
// var(--xy-background-color, …), so it never shadows a value from an ancestor —
// which means one element up the tree can decide the whole palette and both
// canvases, plus the dashed insert buttons that cut slots out of it, inherit it.
// That keeps the choice in detail.tsx, where the release and the focused run are
// already known, rather than threading props into two canvases and a button.
//
// Naming our own variables rather than writing React Flow's directly is what
// lets the buttons match: they need the canvas fill too, and bg-[var(--canvas-fill)]
// reads as "the canvas's fill" where bg-[var(--xy-background-color)] would read as
// a library internal.
export type CanvasRelease = 'phase-1' | 'exploration';

// review is optional, and neither release currently sets it — selecting a member
// leaves the canvas exactly as it was. Repainting the largest surface on screen (and,
// before that, framing it) announced a change of mode when all that happened was a row
// being clicked; the member button in the canvas corner names who's in focus, which is
// where the change actually is. Kept as a hook because the mechanism is sound and the
// question is only how loudly to state the mode.
const CANVAS_THEMES: Record<CanvasRelease, { base: string; review?: string }> = {
  // Phase 1 matches the shipping canvas exactly: grey-50 in light, and in dark the
  // same --background the flow already sits on. Diverge from this only with a
  // reason — the proto is meant to be indistinguishable from the real editor here.
  'phase-1': {
    base: '[--canvas-fill:var(--color-grey-50)] [--canvas-dots:var(--color-grey-500)] [--canvas-edge:var(--color-grey-500)] dark:[--canvas-fill:var(--background)] dark:[--canvas-dots:var(--color-grey-900)] dark:[--canvas-edge:var(--color-grey-800)]',
  },
  // Exploration is free to diverge — its canvas is a detached window rather than a
  // full-bleed surface, so it doesn't have to answer to the shipping editor.
  //
  // One step off phase 1 in each mode: grey-100 rather than grey-50 in light, and
  // pure black rather than --background in dark. The window has to separate from
  // the PAGE, not fill the screen, so both moves are away from the page's own fill.
  //
  // Dark goes DOWN, which is what makes it work. Lifting the canvas was tried first
  // and there's no room above it: the ladder has no stop between --background
  // (0.178) and --surface-elevated (0.204), so the only step available put the
  // canvas on the same fill as the node cards and flattened them into it. Black is
  // below the page instead, so the window reads against it AND the cards sit a full
  // 0.204 above the canvas — a wider gap than they had to begin with.
  //
  // #000 is a literal, and it's deliberate: there is no token for it. Ghost's
  // --color-black is oklch(20.38%), which is the same colour as the dark card
  // surface (--color-sidebar-bg, 20.4%) — setting the canvas to it looks like
  // nothing happened. And --background, the page, is 17.8%, DARKER than the
  // system's own "black". So the palette has no stop below the page, and every
  // token option lands either on the page fill or on the card fill.
  //
  // The one bespoke value in this table, held to the one thing tokens can't
  // express. If a true black ever gets a token, this is the line to replace.
  //
  // It also retires the old objection to a black canvas — that the shipping
  // editor's insert buttons rendered as holes on it. Here the buttons take
  // --canvas-fill like everything else, so they're the same black and read as
  // slots by their dashed border, which is the intent.
  //
  // No review entry, deliberately. Repainting the whole canvas to say a member is
  // selected was too big a move for what it reports — the surface is the largest
  // thing on screen and recolouring it announced a change of mode when all that
  // happened was a row being clicked. The inset frame and the member button carry
  // it instead, both of which sit where the change actually is.
  exploration: {
    base: '[--canvas-fill:var(--color-grey-100)] [--canvas-dots:var(--color-grey-500)] [--canvas-edge:var(--color-grey-500)] dark:[--canvas-fill:#000] dark:[--canvas-dots:var(--color-grey-900)] dark:[--canvas-edge:var(--color-grey-800)]',
  },
};

// Maps our names onto React Flow's. Constant — only the table above changes.
const CANVAS_FLOW_VARS =
  '[--xy-background-color:var(--canvas-fill)] [--xy-background-pattern-color:var(--canvas-dots)] [--xy-edge-stroke:var(--canvas-edge)]';

// review = a member's run is in focus, so the canvas states the mode by its own
// surface rather than only by chrome drawn over it.
export const canvasTheme = (release: CanvasRelease, review = false): string => {
  const theme = CANVAS_THEMES[release];
  return `${CANVAS_FLOW_VARS} ${(review && theme.review) || theme.base}`;
};

// The dashed insert buttons read as empty slots cut out of the canvas, so they
// take its fill — opaque, so the dot pattern doesn't show through the slot.
// Inherited from the same region, so they can't drift from it.
export const CANVAS_SLOT_FILL = 'bg-[var(--canvas-fill)]';

// Column layout — a single vertical stack of fixed-width nodes. Node y-positions
// are derived from each node's *rendered height* plus a constant visible gap, so
// the connector lines read as evenly spaced no matter how tall any individual node
// is (an email node with a stats footer is much taller than a bare wait node).
// Mirrors the real editor's automation-canvas layout.
export const NODE_WIDTH = 400;

// Visible space between one node's bottom and the next node's top — constant
// across every pair.
export const NODE_VISUAL_GAP = 112;

// Only used for the first frame, before anything has been measured. Any value
// works — it's replaced the moment React Flow reports a real one.
const UNMEASURED_NODE_HEIGHT = 200;

// Lays the column out from MEASURED node heights rather than estimated ones.
//
// Both canvases position nodes by hand, because the thing they're keeping constant
// is the *visible gap* between cards — and a gap can only be constant if you know
// how tall each card is. That used to mean a constant per card shape, summed by a
// per-canvas nodeHeight(): a base, plus the email preview, plus the stats footer,
// plus the inline analytics block, plus the links block when open. Every one of
// them an estimate of a rendered height, and every card change silently invalidated
// a few. The bug they produce is always the same and always invisible in review —
// the card is fine, the space under it is wrong.
//
// React Flow already measures every node it renders (v12 keeps dimensions in its
// own store) and reports each measurement through onNodesChange. So the heights
// don't have to be predicted at all: let the cards render at whatever height their
// content needs, read it back, and stack from that. Card layouts can then change —
// or grow a variable number of conditions, or a whole new step kind — with no
// layout constant to retune, because there aren't any.
//
// Safe against feedback loops: card width is fixed (NODE_CARD_SHELL), so a card's
// height never depends on where it was placed. Measure → reposition → re-measure
// yields the same height and the loop settles on the second pass.
export const useMeasuredColumn = () => {
  const [heights, setHeights] = useState<Record<string, number>>({});

  // The canvas owns positions; React Flow owns sizes. Every other kind of change
  // it offers here (position, selection, removal) is something we drive from the
  // draft instead, so dimensions are all we take.
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setHeights((current) => {
      let next = current;
      for (const change of changes) {
        if (change.type !== 'dimensions' || !change.dimensions) {
          continue;
        }
        const height = Math.round(change.dimensions.height);
        // Bail on an unchanged height so a re-measure that agrees with the
        // last one doesn't produce a new object and re-run the layout.
        if (!height || current[change.id] === height) {
          continue;
        }
        if (next === current) {
          next = { ...current };
        }
        next[change.id] = height;
      }
      return next;
    });
  }, []);

  // Node order in, top-Y per node out — plus the bottom edge of the last card,
  // which is what the pan bound needs. Ids are the only input: whatever a card
  // renders, its height is already known by the time this runs.
  const layout = useCallback(
    (ids: string[]) => {
      const measured = ids.map((id) => heights[id] ?? UNMEASURED_NODE_HEIGHT);
      let cursor = 0;
      const ys = measured.map((height) => {
        const y = cursor;
        cursor += height + NODE_VISUAL_GAP;
        return y;
      });
      const bottom = measured.length ? ys[ys.length - 1] + measured[measured.length - 1] : 0;
      return { ys, bottom };
    },
    [heights],
  );

  return { onNodesChange, layout };
};

// The three editable step kinds share one icon per kind across both canvases.
// (The read-only canvas's "terminal" marker renders its own chrome, so it isn't
// part of this map.)
export type StepKind = 'trigger' | 'email' | 'wait';

export const stepKindIcon: Record<StepKind, ElementType> = {
  trigger: LucideIcon.Zap,
  email: LucideIcon.Mail,
  wait: LucideIcon.Clock,
};

export const formatWait = (hours: number): string => {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};

// Follow the edge chain from the head so actions come out in flow order.
export const orderActions = (automation: AutomationDetail): AutomationAction[] => {
  const { actions, edges } = automation;
  if (edges.length === 0) {
    return actions;
  }
  const targets = new Set(edges.map((e) => e.target_action_id));
  const byId = new Map(actions.map((a) => [a.id, a]));
  const nextOf = new Map(edges.map((e) => [e.source_action_id, e.target_action_id]));
  const head = actions.find((a) => !targets.has(a.id)) ?? actions[0];

  const ordered: AutomationAction[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined = head?.id;
  while (cursor && byId.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    ordered.push(byId.get(cursor)!);
    cursor = nextOf.get(cursor);
  }
  return ordered;
};

// Centres the node column in the canvas and keeps it centred as the canvas resizes
// (window, sidebar collapse, edit-mode expand) while preserving the user's pan/zoom.
// `leftInset` reserves space on the left (e.g. the floating performance card) so the
// column is centred in the area BESIDE it, never underneath. Also tracks the canvas
// size so panTranslateExtent can bound panning to a real viewport. Returns the ref
// for the ReactFlow wrapper, the onInit handler, and the current canvas size.
// Fixed screen-space Y for the top of the first node, shared by every canvas/state so
// the flow doesn't bob vertically as you move between read / run / edit.
export const INITIAL_VIEWPORT_Y = 48;

export function useCenteredColumn(leftInset = 0) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const centerColumn = useCallback(() => {
    const instance = flowRef.current;
    const el = canvasRef.current;
    if (!instance || !el) {
      return;
    }
    const { zoom } = instance.getViewport();
    const x = Math.round(leftInset + (el.clientWidth - leftInset - NODE_WIDTH * zoom) / 2);
    // Re-anchor Y to the shared default (not the drifted value) so state transitions
    // keep the first node at the same height instead of jumping.
    void instance.setViewport({ x, y: INITIAL_VIEWPORT_Y, zoom });
  }, [leftInset]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
      centerColumn();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [centerColumn]);

  const onInit = useCallback(
    (instance: ReactFlowInstance) => {
      flowRef.current = instance;
      const el = canvasRef.current;
      const width = el?.clientWidth ?? 800;
      setSize({ width, height: el?.clientHeight ?? 600 });
      const x = Math.round(leftInset + (width - leftInset - NODE_WIDTH) / 2);
      void instance.setViewport({ x, y: INITIAL_VIEWPORT_Y, zoom: 1 });
    },
    [leftInset],
  );

  return { canvasRef, onInit, size };
}

// Bounds panning to the automation's content plus a margin, so the flow can't be
// lost in an infinite void (à la Resend). Grows automatically as the flow gets
// taller — `contentBottom` is the y of the last node's bottom edge, and the column
// spans x: 0..NODE_WIDTH. The extent always contains the centred initial viewport
// (zoom 1, y = 48, offset by leftInset), so bounding never fights useCenteredColumn.
//
// Vertical slack is a share of the viewport (you pan to read a tall flow); horizontal
// slack is a small FIXED value — the column is narrow and shouldn't wander sideways,
// and a viewport-sized horizontal margin let it slide off the right edge entirely.
// NOTE: this is a fixed flow-coordinate box, so the on-screen slack scales with zoom
// (see PAN_MARGIN_RATIO usage + minZoom/maxZoom on the canvases).
export const PAN_MARGIN_RATIO = 0.5;
export const PAN_SLACK_X = 160;
export function panTranslateExtent(
  contentBottom: number,
  size: { width: number; height: number },
  leftInset = 0,
): [[number, number], [number, number]] {
  const w = size.width || 1200;
  const h = size.height || 800;
  const marginY = h * PAN_MARGIN_RATIO;
  // The centred initial viewport in flow coords (matches useCenteredColumn: zoom 1,
  // y = 48). Included so the bound can never clamp our own starting position.
  const centeredX = leftInset + (w - leftInset - NODE_WIDTH) / 2;
  const visLeft = -centeredX;
  const visRight = w - centeredX;
  const visTop = -48;
  const visBottom = h - 48;
  return [
    [Math.min(0, visLeft) - PAN_SLACK_X, Math.min(0, visTop) - marginY],
    [Math.max(NODE_WIDTH, visRight) + PAN_SLACK_X, Math.max(contentBottom, visBottom) + marginY],
  ];
}

// Where floating chrome sits inside the canvas: 24px off every edge.
//
// One number rather than a per-edge argument. It was 24 on the sides and bottom and
// 16 at the top, each reasoned separately — the sides borrowed the pane's gutter, the
// bottom matched the sides because 16 looked dropped against a bare edge. Four
// defensible numbers still add up to a corner that doesn't square up, so it's one
// value now; the canvas is a window in its own right rather than something taking its
// measurements off the panel beside it.
//
// The zoom controls need it as px because React Flow positions their panel with
// inline styles — see AutomationCanvasControls, which takes the inset rather than
// fixing it. Everything else on the canvas expresses the same number as Tailwind
// (top-6 / left-6).
export const CANVAS_HUD_INSET = { bottom: 24, left: 24 };

// Floating controls on the canvas are Shade Buttons on the outline variant — the
// same control the rest of Ghost uses — with one addition: outline is bg-transparent,
// and a transparent button over the dot grid reads as a hole rather than a thing, so
// they take an opaque surface. No shadow: no button in Ghost carries one, and the
// elevation here is the border plus being opaque over a texture.
//
// h-9 because Shade's own two sizes disagree — size="icon" is 36px while a default
// button is h-(--control-height) at 32px — and a labelled button next to an icon one
// has to pick the same number or they read as different classes of control.
export const CANVAS_HUD_BUTTON = 'h-9 bg-surface-elevated';
