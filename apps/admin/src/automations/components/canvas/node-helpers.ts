import type {InsertActionAnchor} from '@tryghost/admin-x-framework/api/automations';
import {StepNode, TAIL_CANVAS_ID, TRIGGER_CANVAS_ID, TailNode, TriggerNode, type CanvasAnchor} from './nodes';

// Non-component helpers extracted out of ./nodes so that file only exports
// components (react-refresh/only-export-components).

export const nodeTypes = {
    trigger: TriggerNode,
    step: StepNode,
    tail: TailNode
};

export const toApiAnchor = ({sourceId, targetId}: CanvasAnchor): InsertActionAnchor => ({
    previousActionId: sourceId === TRIGGER_CANVAS_ID ? undefined : sourceId,
    nextActionId: targetId === TAIL_CANVAS_ID ? undefined : targetId
});
