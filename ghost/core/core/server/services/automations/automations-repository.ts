import type {ReadonlyDeep} from 'type-fest';

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

export interface AutomationEmailStats {
    email_sent_count: number;
    email_opened_count: number;
    opened_rate: number | null;
    clicked_rate: number | null;
}

export interface SendEmailAction {
    id: string;
    type: 'send_email';
    data: {
        email_subject: string;
        email_lexical: string;
        email_design_setting_id: string;
    };
    stats?: AutomationEmailStats;
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
    locked_by: string;
    automation_run_id: string;
    automation_id: string;
    // NOTE: This property will be removed once we support additional automation triggers.
    automation_slug: string;
    automation_status: 'inactive' | 'active';
    member_id: string | null;
    member_email: string;
    action_id: string;
    automation_action_revision_id: string;
    ready_at: Date;
    step_attempts: number;
};

export type AutomationStepToRun = ReadonlyDeep<AutomationStepBase & (
    {
        type: 'wait';
        wait_hours: number;
    } | {
        type: 'send_email';
        email_subject: string;
        email_lexical: string;
        email_design_setting_id: string | null;
    }
)>;

export type AutomationStepTerminalStatus =
    | 'automation disabled'
    | 'failed'
    | 'finished'
    | 'member changed status'
    | 'member unsubscribed';

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
     * Select the steps we want to run and return the next time any remaining
     * pending step should be polled, if any.
     *
     * If we could guarantee this function would only be called once ever, it'd
     * be pretty simple! However, we want to handle cases where this function is
     * called multiple times simultaneously (maybe in different processes
     * querying the same database). That's why we implement a row-level locking
     * mechanism, hence the word "lock" in the name of this function.
     */
    fetchAndLockSteps(limit: number): Promise<{
        steps: AutomationStepToRun[],
        nextStepReadyAt: Date | null;
    }>;
    /**
     * Atomically finish a locked step and create the next one so concurrent
     * runners cannot enqueue duplicates.
     *
     * Returns the next step's ready time, or null if no next step was created.
     */
    finishStepAndEnqueueNext(
        step: Pick<AutomationStepToRun, 'id' | 'locked_by' | 'action_id' | 'automation_run_id'>
    ): Promise<Date | null>;
    /**
     * Stop a locked step without continuing the automation, preserving the
     * reason it ended.
     *
     * Returns whether the step was updated.
     */
    markStepTerminal(
        step: Pick<AutomationStepToRun, 'id' | 'locked_by'>,
        status: AutomationStepTerminalStatus
    ): Promise<boolean>;
    /**
     * Put a locked step back in the queue for another attempt.
     *
     * Returns whether the step was updated.
     */
    retryStep(
        step: Pick<AutomationStepToRun, 'id' | 'locked_by'>,
        retryAt: Readonly<Date>
    ): Promise<boolean>;
}
