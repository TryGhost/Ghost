import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

export const NODE_TYPE_TRIGGER = 'trigger' as const;
export const NODE_TYPE_STEP = 'campaignStep' as const;
export const NODE_TYPE_ADD = 'addStep' as const;
export const EDGE_TYPE_DELAY = 'delay' as const;

export interface TriggerNodeData {
    label: string;
    [key: string]: unknown;
}

export interface StepNodeData {
    step: AutomatedEmail;
    index: number;
    delayLabel: string;
    onEdit: (step: AutomatedEmail) => void;
    onDelete: (step: AutomatedEmail) => void;
    onEditDelay: (step: AutomatedEmail, newDelay: number) => void;
    [key: string]: unknown;
}

export interface AddStepNodeData {
    onAdd: () => void;
    [key: string]: unknown;
}

export interface DelayEdgeData {
    label: string;
    stepId?: string;
    onEditDelay?: (stepId: string, newDelay: number) => void;
    [key: string]: unknown;
}
