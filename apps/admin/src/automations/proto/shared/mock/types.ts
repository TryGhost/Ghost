import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';

// ---------------------------------------------------------------------------
// Net-new types for the automations run-analytics exploration.
//
// None of this exists in the real feature yet — these are the shapes we're
// *designing*. They're modeled snake_case, as if served by a future API, so the
// eventual real implementation is a straight port. The automation definition
// itself (AutomationDetail) is borrowed unchanged from admin-x-framework; a run
// overlays onto it by referencing real AutomationAction ids.
// ---------------------------------------------------------------------------

export type RunStatus = 'in_progress' | 'completed' | 'exited_early';

export type RunStepState = 'done' | 'current' | 'skipped' | 'upcoming';

/** One action's outcome for a single member. `action_id` → AutomationAction.id. */
export type RunStep = {
    action_id: string;
    state: RunStepState;
    occurred_at: string | null;
    detail: string | null; // e.g. "Opened (1 link)", "Unsubscribed", "Sends Jul 17"
    /**
     * The step ran and something went wrong — a bounce, a send error. Its own
     * flag rather than a `state`, because failing isn't a position in the flow:
     * the step still happened (`state: 'done'`), it just didn't do its job. A run
     * that ends this way is still `exited_early` — the member left the flow —
     * but the reason is the system's, not theirs, and the UI says so.
     */
    failed?: boolean;
};

/** A lightweight member reference — a subset of the real Member. */
export type RunMember = {
    id: string;
    name: string;
    email: string;
};

/** A single member's pass through an automation. */
export type AutomationRun = {
    id: string;
    automation_id: string; // → AutomationDetail.id
    member: RunMember;
    status: RunStatus;
    enrolled_at: string;
    completed_at: string | null;
    current_action_id: string | null; // → AutomationAction.id, when in_progress
    exit_reason: string | null; // e.g. "Unsubscribed", "Upgraded", when exited_early
    steps: RunStep[];
};

export type EnrollmentPoint = {date: string; count: number};

/** Aggregate funnel + timeseries powering the dashboard header and chart. */
export type AutomationRunMetrics = {
    automation_id: string;
    enrollments: number;
    in_progress: number;
    completed: number;
    exited_early: number;
    last_enrolled_at: string | null;
    enrollments_by_day: EnrollmentPoint[];
};

/** The four funnel counts on AutomationRunMetrics, each chartable over time. */
export type MetricKey = 'enrollments' | 'in_progress' | 'completed' | 'exited_early';

/** Everything the dashboard detail page needs for one automation. */
export type AutomationScenario = {
    automation: AutomationDetail;
    metrics: AutomationRunMetrics;
    runs: AutomationRun[];
};
