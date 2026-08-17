import {type ElementType, useCallback, useEffect, useRef, useState} from 'react';
import type {AutomationAction, AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import type {ReactFlowInstance} from '@xyflow/react';
import {LucideIcon} from '@tryghost/shade/utils';

// Shared flow helpers + scaffolding, kept out of the canvas component files so
// those can export only components (react-refresh/only-export-components). Both
// the read-only (flow-canvas) and editable (edit-canvas) canvases build on these.

// Edge stroke + canvas theme vars, shared here (rather than defined per-canvas)
// so the two canvases can't drift back apart the way flow-canvas's did before.
export const EDGE_STROKE = 'var(--xy-edge-stroke)';
// Canvas fill, taken verbatim from the shipping automation-canvas
// (automations/components/canvas/automation-canvas.tsx): grey-50 in light, and
// --background in dark, which is the stop below the cards' --surface-elevated.
// The proto had drifted to --background in both modes (white cards on a white
// page in light) and then to --surface-page (pure black in dark). Production had
// already solved this; there's nothing here to invent.
//
// Exported because three things need the same fill and would each be a seam if
// they drifted: the ReactFlow surface, the region behind it, and the dashed
// insert buttons that cut out of it.
export const CANVAS_SURFACE = 'bg-grey-50 dark:bg-background';

// Dots + edges, also verbatim from the shipping canvas — same greys, same pair of
// modes. This replaces a hardcoded #ffffff1a the proto had picked up for dark.
export const REACT_FLOW_THEME = '[--xy-background-color:var(--color-grey-50)] [--xy-background-pattern-color:var(--color-grey-500)] [--xy-edge-stroke:var(--color-grey-300)] dark:[--xy-background-color:var(--background)] dark:[--xy-background-pattern-color:var(--color-grey-900)] dark:[--xy-edge-stroke:var(--color-grey-800)]';

// Column layout — a single vertical stack of fixed-width nodes. Node y-positions
// are derived from each node's *rendered height* plus a constant visible gap, so
// the connector lines read as evenly spaced no matter how tall any individual node
// is (an email node with a stats footer is much taller than a bare wait node).
// Mirrors the real editor's automation-canvas layout.
export const NODE_WIDTH = 400;

// Visible space between one node's bottom and the next node's top — constant
// across every pair.
export const NODE_VISUAL_GAP = 112;

// Approximate rendered heights, used only to keep the *visible* gap uniform. If a
// node's body layout changes, retune these. (The real canvas hardcodes the same
// way — see REGULAR_NODE_HEIGHT / EMAIL_NODE_WITH_STATS_HEIGHT there.)
export const REGULAR_NODE_HEIGHT = 72; // trigger / wait / email header only
export const TRIGGER_SUMMARY_HEIGHT = 44; // trigger node's one-line config summary
export const STATS_FOOTER_HEIGHT = 64; // email node's 3-metric stats footer
export const DETAIL_FOOTER_HEIGHT = 36; // read-only run-detail footer (single line)
export const TERMINAL_NODE_HEIGHT = 40; // read-only "Complete" pill
export const TAIL_NODE_HEIGHT = 48; // editable "add step" tail button

// Cumulative top-Y for a vertical stack of nodes with the given rendered heights,
// keeping NODE_VISUAL_GAP of visible space between each consecutive pair.
export const stackNodeY = (heights: number[], gap: number = NODE_VISUAL_GAP): number[] => {
    let cursor = 0;
    return heights.map((height) => {
        const y = cursor;
        cursor += height + gap;
        return y;
    });
};

// The three editable step kinds share one icon per kind across both canvases.
// (The read-only canvas's "terminal" marker renders its own chrome, so it isn't
// part of this map.)
export type StepKind = 'trigger' | 'email' | 'wait';

export const stepKindIcon: Record<StepKind, ElementType> = {
    trigger: LucideIcon.Zap,
    email: LucideIcon.Mail,
    wait: LucideIcon.Clock
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
    const {actions, edges} = automation;
    if (edges.length === 0) {
        return actions;
    }
    const targets = new Set(edges.map(e => e.target_action_id));
    const byId = new Map(actions.map(a => [a.id, a]));
    const nextOf = new Map(edges.map(e => [e.source_action_id, e.target_action_id]));
    const head = actions.find(a => !targets.has(a.id)) ?? actions[0];

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
    const [size, setSize] = useState({width: 0, height: 0});

    const centerColumn = useCallback(() => {
        const instance = flowRef.current;
        const el = canvasRef.current;
        if (!instance || !el) {
            return;
        }
        const {zoom} = instance.getViewport();
        const x = Math.round(leftInset + (el.clientWidth - leftInset - NODE_WIDTH * zoom) / 2);
        // Re-anchor Y to the shared default (not the drifted value) so state transitions
        // keep the first node at the same height instead of jumping.
        void instance.setViewport({x, y: INITIAL_VIEWPORT_Y, zoom});
    }, [leftInset]);

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) {
            return;
        }
        const observer = new ResizeObserver(() => {
            setSize({width: el.clientWidth, height: el.clientHeight});
            centerColumn();
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [centerColumn]);

    const onInit = useCallback((instance: ReactFlowInstance) => {
        flowRef.current = instance;
        const el = canvasRef.current;
        const width = el?.clientWidth ?? 800;
        setSize({width, height: el?.clientHeight ?? 600});
        const x = Math.round(leftInset + (width - leftInset - NODE_WIDTH) / 2);
        void instance.setViewport({x, y: INITIAL_VIEWPORT_Y, zoom: 1});
    }, [leftInset]);

    return {canvasRef, onInit, size};
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
    size: {width: number; height: number},
    leftInset = 0
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
        [Math.max(NODE_WIDTH, visRight) + PAN_SLACK_X, Math.max(contentBottom, visBottom) + marginY]
    ];
}
