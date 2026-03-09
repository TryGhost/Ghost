import {EDGE_TYPE_DELAY, NODE_TYPE_ADD, NODE_TYPE_STEP, NODE_TYPE_TRIGGER} from './flow-types';
import type {AddStepNodeData, DelayEdgeData, StepNodeData, TriggerNodeData} from './flow-types';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import type {Edge, Node} from '@xyflow/react';

const NODE_WIDTH = 320;
const NODE_HEIGHT = 60;
const VERTICAL_GAP = 80;

export const formatDelay = (delayDays: number | null, index: number) => {
    if (delayDays === null || delayDays === 0) {
        return 'Sent immediately on signup';
    }
    const label = delayDays === 1 ? '1 day' : `${delayDays} days`;
    return `${label} after ${index === 0 ? 'signup' : 'previous step'}`;
};

interface LayoutCallbacks {
    onEdit: (step: AutomatedEmail) => void;
    onDelete: (step: AutomatedEmail) => void;
    onEditDelay: (step: AutomatedEmail, newDelay: number) => void;
    onEditDelayById: (stepId: string, newDelay: number) => void;
    onAdd: () => void;
}

export function computeLayout(
    steps: AutomatedEmail[],
    campaignType: string,
    callbacks: LayoutCallbacks
): {nodes: Node[]; edges: Edge[]} {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const triggerLabel = campaignType === 'paid_signup' ? 'Paid Member Signup' : 'Free Member Signup';
    const x = 0;
    let y = 0;

    // Trigger node
    nodes.push({
        id: 'trigger',
        type: NODE_TYPE_TRIGGER,
        position: {x, y},
        data: {label: triggerLabel} satisfies TriggerNodeData,
        draggable: false,
        selectable: false,
        width: NODE_WIDTH,
        height: NODE_HEIGHT
    });

    // Step nodes
    steps.forEach((step, index) => {
        y += NODE_HEIGHT + VERTICAL_GAP;
        const stepId = `step-${step.id}`;

        nodes.push({
            id: stepId,
            type: NODE_TYPE_STEP,
            position: {x, y},
            data: {
                step,
                index,
                delayLabel: formatDelay(step.delay_days, index),
                onEdit: callbacks.onEdit,
                onDelete: callbacks.onDelete,
                onEditDelay: callbacks.onEditDelay
            } satisfies StepNodeData,
            width: NODE_WIDTH,
            height: NODE_HEIGHT
        });

        const sourceId = index === 0 ? 'trigger' : `step-${steps[index - 1].id}`;
        const isFirstStep = index === 0;
        edges.push({
            id: `edge-${sourceId}-${stepId}`,
            source: sourceId,
            target: stepId,
            type: EDGE_TYPE_DELAY,
            data: {
                label: formatDelay(step.delay_days, index),
                ...(isFirstStep ? {} : {stepId: step.id, onEditDelay: callbacks.onEditDelayById})
            } satisfies DelayEdgeData
        });
    });

    // Add step node
    y += NODE_HEIGHT + VERTICAL_GAP;
    const addNodeId = 'add-step';

    nodes.push({
        id: addNodeId,
        type: NODE_TYPE_ADD,
        position: {x, y},
        data: {onAdd: callbacks.onAdd} satisfies AddStepNodeData,
        draggable: false,
        width: NODE_WIDTH,
        height: 40
    });

    const lastSourceId = steps.length > 0 ? `step-${steps[steps.length - 1].id}` : 'trigger';
    edges.push({
        id: `edge-${lastSourceId}-${addNodeId}`,
        source: lastSourceId,
        target: addNodeId,
        type: EDGE_TYPE_DELAY,
        data: {label: ''} satisfies DelayEdgeData
    });

    return {nodes, edges};
}

export function computeContainerHeight(stepCount: number): number {
    const totalNodes = stepCount + 2; // trigger + steps + add
    return totalNodes * NODE_HEIGHT + (totalNodes - 1) * VERTICAL_GAP + 40;
}
