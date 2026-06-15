import ObjectId from 'bson-objectid';
import {Meta, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';
import type {ReadonlyDeep} from 'type-fest';

export type AutomationStatus = 'active' | 'inactive';
export const MAX_AUTOMATION_ACTIONS = 20;

export type Automation = {
    id: string;
    name: string;
    slug: string;
    status: AutomationStatus;
}

export type AutomationWaitAction = {
    id: string;
    type: 'wait';
    data: {
        wait_hours: number;
    };
}

export type AutomationSendEmailAction = {
    id: string;
    type: 'send_email';
    data: {
        email_subject: string;
        email_lexical: string;
        email_design_setting_id: string;
    };
}

export type AutomationAction = AutomationWaitAction | AutomationSendEmailAction;

export type AutomationEdge = {
    source_action_id: string;
    target_action_id: string;
}

export type AutomationDetail = Automation & {
    created_at: string;
    updated_at: string;
    actions: AutomationAction[];
    edges: AutomationEdge[];
}

export type EditAutomationPayload = {
    id: string;
    status: AutomationStatus;
    actions: AutomationAction[];
    edges: AutomationEdge[];
}

export interface AutomationsResponseType {
    meta?: Meta;
    automations: Automation[];
}

export interface AutomationDetailResponseType {
    automations: AutomationDetail[];
}

const dataType = 'AutomationsResponseType';

export const useBrowseAutomations = createQuery<AutomationsResponseType>({
    dataType,
    path: '/automations/'
});

export const useReadAutomation = createQueryWithId<AutomationDetailResponseType>({
    dataType,
    path: id => `/automations/${id}/`
});

export const useEditAutomation = createMutation<AutomationDetailResponseType, EditAutomationPayload>({
    method: 'PUT',
    path: ({id}) => `/automations/${id}/`,
    body: ({status, actions, edges}) => ({
        automations: [{
            status,
            actions,
            edges
        }]
    }),
    invalidateQueries: {
        dataType
    }
});

const generateActionId = (): string => ObjectId().toHexString();
const DEFAULT_EMAIL_DESIGN_SETTING_SLUG = 'default-automated-email';

const EMPTY_EMAIL_LEXICAL = JSON.stringify({
    root: {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1
    }
});

const buildWaitAction = (): AutomationWaitAction => ({
    id: generateActionId(),
    type: 'wait',
    data: {wait_hours: 24}
});

const buildSendEmailAction = (): AutomationSendEmailAction => ({
    id: generateActionId(),
    type: 'send_email',
    data: {
        email_subject: '',
        email_lexical: EMPTY_EMAIL_LEXICAL,
        email_design_setting_id: DEFAULT_EMAIL_DESIGN_SETTING_SLUG
    }
});

// Anchor for where to splice a new action into the chain. `undefined` on either side means "no
// real action there" — i.e. inserting at the head (no previousActionId) or the tail (no
// nextActionId). When both are defined, we're inserting between two existing actions and the
// direct edge between them is replaced.
export type InsertActionAnchor = {
    previousActionId?: string;
    nextActionId?: string;
};

type SpliceActionArgs = ReadonlyDeep<{
    detail: AutomationDetail;
    action: AutomationAction;
    anchor: InsertActionAnchor;
}>;

type InsertActionArgs = ReadonlyDeep<{
    detail: AutomationDetail;
    anchor: InsertActionAnchor;
}>;

const assertActionExists = (detail: ReadonlyDeep<AutomationDetail>, id: string): void => {
    if (!detail.actions.some(action => action.id === id)) {
        throw new Error(`spliceAction: anchor references unknown action id "${id}"`);
    }
};

const hasEdge = (detail: ReadonlyDeep<AutomationDetail>, sourceActionId: string, targetActionId: string): boolean => (
    detail.edges.some(edge => edge.source_action_id === sourceActionId && edge.target_action_id === targetActionId)
);

const spliceAction = ({detail, action, anchor}: SpliceActionArgs): AutomationDetail => {
    const {previousActionId, nextActionId} = anchor;
    if (previousActionId !== undefined) {
        assertActionExists(detail, previousActionId);
    }
    if (nextActionId !== undefined) {
        assertActionExists(detail, nextActionId);
    }
    if (previousActionId === undefined && nextActionId === undefined && detail.actions.length > 0) {
        throw new Error('spliceAction: anchor is required when inserting into a non-empty automation');
    }
    if (previousActionId !== undefined && nextActionId !== undefined && !hasEdge(detail, previousActionId, nextActionId)) {
        throw new Error(`spliceAction: anchor edge "${previousActionId}" -> "${nextActionId}" does not exist`);
    }
    if (previousActionId !== undefined && nextActionId === undefined && detail.edges.some(edge => edge.source_action_id === previousActionId)) {
        throw new Error(`spliceAction: anchor previousActionId "${previousActionId}" is not the tail action`);
    }
    if (previousActionId === undefined && nextActionId !== undefined && detail.edges.some(edge => edge.target_action_id === nextActionId)) {
        throw new Error(`spliceAction: anchor nextActionId "${nextActionId}" is not the head action`);
    }
    const actions = [...detail.actions, action];
    const newEdges = detail.edges.filter(edge => !(edge.source_action_id === previousActionId && edge.target_action_id === nextActionId));
    if (previousActionId !== undefined) {
        newEdges.push({source_action_id: previousActionId, target_action_id: action.id});
    }
    if (nextActionId !== undefined) {
        newEdges.push({source_action_id: action.id, target_action_id: nextActionId});
    }
    return {...detail, actions, edges: newEdges};
};

export const insertWaitAction = ({detail, anchor}: InsertActionArgs): AutomationDetail => (
    spliceAction({detail, action: buildWaitAction(), anchor})
);

export const insertSendEmailAction = ({detail, anchor}: InsertActionArgs): AutomationDetail => (
    spliceAction({detail, action: buildSendEmailAction(), anchor})
);

type RemoveActionArgs = ReadonlyDeep<{
    detail: AutomationDetail;
    actionId: string;
}>;

type UpdateWaitActionArgs = ReadonlyDeep<{
    detail: AutomationDetail;
    actionId: string;
    waitHours: number;
}>;

type UpdateSendEmailActionArgs = ReadonlyDeep<{
    detail: AutomationDetail;
    actionId: string;
    emailSubject: string;
    emailLexical: string;
}>;

export const updateWaitAction = ({detail, actionId, waitHours}: UpdateWaitActionArgs): AutomationDetail => {
    if (!Number.isSafeInteger(waitHours) || waitHours <= 0) {
        throw new Error(`updateWaitAction: waitHours must be a safe positive integer, received "${waitHours}"`);
    }

    let hasUpdated = false;
    const actions = detail.actions.map((action) => {
        if (action.id === actionId) {
            if (action.type !== 'wait') {
                throw new Error(`updateWaitAction: action "${actionId}" is not a wait action`);
            }
            hasUpdated = true;
            return {
                ...action,
                data: {
                    ...action.data,
                    wait_hours: waitHours
                }
            };
        }
        return action;
    });

    if (!hasUpdated) {
        throw new Error(`updateWaitAction: unknown action id "${actionId}"`);
    }

    return {...detail, actions, edges: [...detail.edges]};
};

export const updateSendEmailAction = ({detail, actionId, emailSubject, emailLexical}: UpdateSendEmailActionArgs): AutomationDetail => {
    let hasUpdated = false;
    const actions = detail.actions.map((action) => {
        if (action.id === actionId) {
            if (action.type !== 'send_email') {
                throw new Error(`updateSendEmailAction: action "${actionId}" is not a send_email action`);
            }
            hasUpdated = true;
            return {
                ...action,
                data: {
                    ...action.data,
                    email_subject: emailSubject,
                    email_lexical: emailLexical
                }
            };
        }
        return action;
    });

    if (!hasUpdated) {
        throw new Error(`updateSendEmailAction: unknown action id "${actionId}"`);
    }

    return {...detail, actions, edges: [...detail.edges]};
};

export const removeAction = ({detail, actionId}: RemoveActionArgs): AutomationDetail => {
    const remainingActions = detail.actions.filter(action => action.id !== actionId);

    const wasActionFound = remainingActions.length < detail.actions.length;
    if (!wasActionFound) {
        throw new Error(`removeAction: unknown action id "${actionId}"`);
    }

    const incoming = detail.edges.find(edge => edge.target_action_id === actionId);
    const outgoing = detail.edges.find(edge => edge.source_action_id === actionId);

    const remainingEdges = detail.edges.filter(
        edge => edge.source_action_id !== actionId && edge.target_action_id !== actionId
    );
    if (incoming && outgoing) {
        remainingEdges.push({
            source_action_id: incoming.source_action_id,
            target_action_id: outgoing.target_action_id
        });
    }

    return {...detail, actions: remainingActions, edges: remainingEdges};
};
