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

export interface EditAutomationData {
    status: string;
    actions: AutomationAction[];
    edges: AutomationEdge[];
}

type AutomationStepBase = {
    id: string;
    step_attempts: number;
    automation_run_id: string;
    automation_status: 'inactive' | 'active';
    member_id: string | null;
    member_email: string;
    action_id: string;
};

export type AutomationStepToRun = AutomationStepBase & (
    {
        type: 'wait';
        wait_hours: number;
    } | {
        type: 'send_email';
        email_subject: string;
        email_lexical: string;
        email_sender_name: string | null;
        email_sender_email: string | null;
        email_sender_reply_to: string | null;
        email_design_setting_id: string | null;
    }
);

export interface AutomationsRepository {
    browse(): Promise<Page<AutomationSummary>>;
    getById(id: string): Promise<Automation | null>;
    edit(id: string, data: EditAutomationData): Promise<Automation | null>;
    trigger(options: {
        memberEmail: string;
        memberId: string;
        memberStatus: 'free' | 'paid';
    }): Promise<void>;
    /**
     * Select the steps we want to run. If no steps are found, returns the time
     * we should try again, if any.
     *
     * If we could guarantee this function would only be called once ever, it'd
     * be pretty simple! However, we want to handle cases where this function is
     * called multiple times simultaneously (maybe in different processes
     * querying the same database). That's why we implement a row-level locking
     * mechanism, hence the word "lock" in the name of this function.
     */
    fetchAndLockSteps(limit: number): Promise<{
        steps: AutomationStepToRun[],
        nextStepReadyAt: null;
    } | {
        steps: never[],
        nextStepReadyAt: Date | null;
    }>;
}
