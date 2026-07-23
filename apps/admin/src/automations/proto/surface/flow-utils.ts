import {type ElementType, useCallback, useEffect, useRef} from 'react';
import type {AutomationAction, AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import type {ReactFlowInstance} from '@xyflow/react';
import {LucideIcon} from '@tryghost/shade/utils';

// Shared flow helpers + scaffolding, kept out of the canvas component files so
// those can export only components (react-refresh/only-export-components). Both
// the read-only (flow-canvas) and editable (edit-canvas) canvases build on these.

// Column layout — a single vertical stack of fixed-width nodes. Node y-positions
// are derived from each node's *rendered height* plus a constant visible gap, so
// the connector lines read as evenly spaced no matter how tall any individual node
// is (an email node with a stats footer is much taller than a bare wait node).
// Mirrors the real editor's automation-canvas layout.
export const NODE_WIDTH = 320;

// Visible space between one node's bottom and the next node's top — constant
// across every pair.
export const NODE_VISUAL_GAP = 112;

// Approximate rendered heights, used only to keep the *visible* gap uniform. If a
// node's body layout changes, retune these. (The real canvas hardcodes the same
// way — see REGULAR_NODE_HEIGHT / EMAIL_NODE_WITH_STATS_HEIGHT there.)
export const REGULAR_NODE_HEIGHT = 72; // trigger / wait / email header only
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

// Centres the node column horizontally in the canvas and keeps it centred as the
// canvas resizes (window, sidebar collapse, edit-mode expand) while preserving
// the user's pan/zoom. Returns the ref to attach to the ReactFlow wrapper and the
// onInit handler to pass to <ReactFlow>.
export function useCenteredColumn() {
    const canvasRef = useRef<HTMLDivElement>(null);
    const flowRef = useRef<ReactFlowInstance | null>(null);

    const centerColumn = useCallback(() => {
        const instance = flowRef.current;
        const el = canvasRef.current;
        if (!instance || !el) {
            return;
        }
        const {y, zoom} = instance.getViewport();
        void instance.setViewport({x: Math.round(el.clientWidth / 2 - (NODE_WIDTH * zoom) / 2), y, zoom});
    }, []);

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) {
            return;
        }
        const observer = new ResizeObserver(() => centerColumn());
        observer.observe(el);
        return () => observer.disconnect();
    }, [centerColumn]);

    const onInit = useCallback((instance: ReactFlowInstance) => {
        flowRef.current = instance;
        const width = canvasRef.current?.clientWidth ?? 800;
        void instance.setViewport({x: Math.round(width / 2 - NODE_WIDTH / 2), y: 48, zoom: 1});
    }, []);

    return {canvasRef, onInit};
}
