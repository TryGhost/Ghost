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

export type AutomationAction = WaitAction | SendEmailAction;

export interface AutomationEdge {
    source_action_id: string;
    target_action_id: string;
}

export interface AutomationSummary {
    id: string;
    slug: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface Automation extends AutomationSummary {
    actions: AutomationAction[];
    edges: AutomationEdge[];
}

export interface AutomationsRepository {
    browse(): Promise<Page<AutomationSummary>>;
    getById(id: string): Promise<Automation | null>;
}
