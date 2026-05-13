import {Meta, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';

export type AutomationStatus = 'active' | 'inactive';

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
        email_sender_name: string | null;
        email_sender_email: string | null;
        email_sender_reply_to: string | null;
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
