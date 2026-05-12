export interface Pagination {
    page: number;
    pages: number;
    limit: number | 'all';
    total: number;
    prev: number | null;
    next: number | null;
}

export interface Page<T> {
    data: T[];
    meta: {
        pagination: Pagination;
    };
}

export interface WaitAction {
    id: string;
    type: 'wait';
    data: {
        wait_hours: number;
    };
}

export interface SendEmailAction {
    id: string;
    type: string;
    data: {
        email_subject: string;
        email_lexical: string;
        email_sender_name: string | null;
        email_sender_email: string | null;
        email_sender_reply_to: string | null;
        email_design_setting_id: string;
    };
}

export type AutomationAction = WaitAction | SendEmailAction;

export interface AutomationEdge {
    source_action_id: string;
    target_action_id: string;
}

export interface Automation {
    id: string;
    slug: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
    actions: AutomationAction[];
    edges: AutomationEdge[];
}

export interface AutomationsRepository {
    browse(): Promise<Page<Automation>>;
    getById(id: string): Promise<Automation | null>;
}
