import {type CSSProperties, type ElementType, useCallback, useEffect, useRef, useState} from 'react';
import type {AutomationAction, AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import type {NodeChange, ReactFlowInstance} from '@xyflow/react';
import {LucideIcon} from '@tryghost/shade/utils';

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
    width: 0
};
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
//
// One semantic token, which flips on its own — this was 'bg-grey-50
// dark:bg-background', a fixed palette value propped up by a dark: variant. The
// palette scale doesn't flip, so the light value was doing all the work and the
// variant had to carry dark on its own; the buttons stayed light when it didn't
// land. --background is white in light and the same oklch(0.178) in dark that
// the flow already paints itself, so the fill matches by definition now.
//
// Not bg-surface-page (what the shipping editor's own insert buttons use): that
// token is pure BLACK in dark, darker than the canvas it sits on, so the buttons
// rendered as holes rather than as empty slots.
export const CANVAS_SURFACE = 'bg-background';

// Dots + edges from the shipping canvas (this replaced a hardcoded #ffffff1a the
// proto had picked up for dark), with one deliberate divergence: light-mode edges
// at grey-500 rather than production's grey-300. At 300 (L~91% on a grey-50
// canvas) the connectors were fainter than the dot texture behind them — the
// decoration outranked the structure. 400 was tried first and still read faint;
// 500 puts the lines at the dots' own stop, which in practice reads stronger
// than the dots because a continuous stroke carries colour that 1px pattern
// circles can't. If it proves out it's a fix the real canvas wants too.
// Dots and edges don't change with the canvas fill — only the fill does — so they
// live apart and both themes below share them verbatim.
const CANVAS_MARKS = '[--xy-background-pattern-color:var(--color-grey-500)] [--xy-edge-stroke:var(--color-grey-500)] dark:[--xy-background-pattern-color:var(--color-grey-900)] dark:[--xy-edge-stroke:var(--color-grey-800)]';

export const REACT_FLOW_THEME = `[--xy-background-color:var(--color-grey-50)] dark:[--xy-background-color:var(--background)] ${CANVAS_MARKS}`;

// Reviewing one member's run: the canvas takes a blue cast, so the mode is stated
// by the surface itself rather than only by chrome drawn on top of it. Tinting
// rather than darkening — a member's run is a state to be in, not a dimming of what
// surrounds it, and the blue ties the field to the blue the current step already
// carries on its card border.
//
// Light and dark are named separately because the palette doesn't flip: blue-50 is
// the faintest wash at the light end, blue-950 the nearest equivalent at the dark
// end. Both are one stop softer than the first pass, which read as a mode you'd been
// dropped into rather than a tint over the one you were already in.
//
// Applied as a whole theme rather than layered over the default: two arbitrary
// properties setting the same variable on one element resolve by stylesheet order,
// not by class order, so overriding a var this way isn't reliable.
export const REACT_FLOW_THEME_REVIEW = `[--xy-background-color:var(--color-blue-50)] dark:[--xy-background-color:var(--color-blue-950)] ${CANVAS_MARKS}`;

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
                    next = {...current};
                }
                next[change.id] = height;
            }
            return next;
        });
    }, []);

    // Node order in, top-Y per node out — plus the bottom edge of the last card,
    // which is what the pan bound needs. Ids are the only input: whatever a card
    // renders, its height is already known by the time this runs.
    const layout = useCallback((ids: string[]) => {
        const measured = ids.map(id => heights[id] ?? UNMEASURED_NODE_HEIGHT);
        let cursor = 0;
        const ys = measured.map((height) => {
            const y = cursor;
            cursor += height + NODE_VISUAL_GAP;
            return y;
        });
        const bottom = measured.length ? ys[ys.length - 1] + measured[measured.length - 1] : 0;
        return {ys, bottom};
    }, [heights]);

    return {onNodesChange, layout};
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

// Where floating chrome sits inside the canvas: 24px off the sides and the bottom,
// 16px off the top. The horizontal figure comes from the pane beside it (px-6), so
// chrome on the canvas lines up with chrome in the panel rather than each carrying
// its own margin.
//
// The bottom is 24 rather than 16 on purpose. At the top the chrome has a header
// sitting immediately above it, which reads as the boundary and gives the eye
// somewhere to stop; at the bottom there's nothing but the edge of the canvas, and
// the same 16px left the controls looking dropped against it. Matching the sides is
// what makes that corner look deliberate.
//
// The zoom controls need it as px because React Flow positions their panel with
// inline styles — see AutomationCanvasControls, which now takes the inset rather
// than fixing it. Everything else on the canvas expresses the same numbers as
// Tailwind (top-4 / left-6).
export const CANVAS_HUD_INSET = {bottom: 24, left: 24};
