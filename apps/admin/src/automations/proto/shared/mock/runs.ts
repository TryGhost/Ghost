import type {AutomationRun, AutomationRunMetrics, AutomationScenario, EnrollmentPoint} from './types';
import {cancellationSurvey, getAutomation, inactiveWinback, paidUpgradeNudge, welcomeSeries} from './automations';

// ---------------------------------------------------------------------------
// Run + metrics data — OWNED (net-new) shapes. Each automation gets an
// enrollment funnel, a daily enrollments series, and a set of member runs whose
// steps reference the automation's real action ids.
// ---------------------------------------------------------------------------

/** Build a daily series ending on a fixed date (deterministic — no "now"). */
function daysSeries(endDate: string, counts: number[]): EnrollmentPoint[] {
    const end = new Date(`${endDate}T00:00:00Z`);
    return counts.map((count, i) => {
        const d = new Date(end);
        d.setUTCDate(end.getUTCDate() - (counts.length - 1 - i));
        return {date: d.toISOString().slice(0, 10), count};
    });
}

type RunData = {metrics: AutomationRunMetrics; runs: AutomationRun[]};

// --- Welcome series (healthy) ---------------------------------------------

const welcomeMetrics: AutomationRunMetrics = {
    automation_id: welcomeSeries.id,
    enrollments: 1432,
    in_progress: 118,
    completed: 1225,
    exited_early: 89,
    last_enrolled_at: '2026-07-21T07:12:00Z',
    enrollments_by_day: daysSeries('2026-07-21', [22, 28, 19, 34, 26, 15, 21, 44, 31, 27, 18, 30, 41, 33, 24, 12, 29, 38, 47, 30, 21, 16, 34, 42, 28, 20, 45, 32, 37, 26])
};

const welcomeRuns: AutomationRun[] = [
    {
        id: 'run_sarah', automation_id: welcomeSeries.id,
        member: {id: 'mem_sarah', name: 'Sarah Lin', email: 'sarah.lin@example.com'},
        status: 'in_progress', enrolled_at: '2026-07-12T09:04:00Z', completed_at: null,
        current_action_id: 'act_tips_email', exit_reason: null,
        steps: [
            {action_id: 'act_welcome_email', state: 'done', occurred_at: '2026-07-12T09:04:00Z', detail: 'Opened · clicked 1 link'},
            {action_id: 'act_wait_3d', state: 'done', occurred_at: '2026-07-12T09:05:00Z', detail: 'Waited 3 days'},
            {action_id: 'act_tips_email', state: 'current', occurred_at: null, detail: 'Sends Jul 17'},
            {action_id: 'act_week1_email', state: 'upcoming', occurred_at: null, detail: null}
        ]
    },
    {
        id: 'run_marcus', automation_id: welcomeSeries.id,
        member: {id: 'mem_marcus', name: 'Marcus Webb', email: 'marcus.webb@example.com'},
        status: 'completed', enrolled_at: '2026-07-08T15:22:00Z', completed_at: '2026-07-14T15:30:00Z',
        current_action_id: null, exit_reason: null,
        steps: [
            {action_id: 'act_welcome_email', state: 'done', occurred_at: '2026-07-08T15:22:00Z', detail: 'Opened'},
            {action_id: 'act_wait_3d', state: 'done', occurred_at: '2026-07-08T15:23:00Z', detail: 'Waited 3 days'},
            {action_id: 'act_tips_email', state: 'done', occurred_at: '2026-07-11T15:23:00Z', detail: 'Opened · clicked 2 links'},
            {action_id: 'act_week1_email', state: 'done', occurred_at: '2026-07-14T15:23:00Z', detail: 'Opened'}
        ]
    },
    {
        id: 'run_priya', automation_id: welcomeSeries.id,
        member: {id: 'mem_priya', name: 'Priya Nair', email: 'priya.nair@example.com'},
        status: 'exited_early', enrolled_at: '2026-07-10T11:47:00Z', completed_at: null,
        current_action_id: null, exit_reason: 'Unsubscribed',
        steps: [
            {action_id: 'act_welcome_email', state: 'done', occurred_at: '2026-07-10T11:47:00Z', detail: 'Unsubscribed'},
            {action_id: 'act_wait_3d', state: 'skipped', occurred_at: null, detail: null},
            {action_id: 'act_tips_email', state: 'skipped', occurred_at: null, detail: null},
            {action_id: 'act_week1_email', state: 'skipped', occurred_at: null, detail: null}
        ]
    },
    {
        id: 'run_tom', automation_id: welcomeSeries.id,
        member: {id: 'mem_tom', name: 'Tom Okafor', email: 'tom.okafor@example.com'},
        status: 'completed', enrolled_at: '2026-06-30T08:15:00Z', completed_at: '2026-07-07T08:20:00Z',
        current_action_id: null, exit_reason: null,
        steps: [
            {action_id: 'act_welcome_email', state: 'done', occurred_at: '2026-06-30T08:15:00Z', detail: 'Opened'},
            {action_id: 'act_wait_3d', state: 'done', occurred_at: '2026-06-30T08:16:00Z', detail: 'Waited 3 days'},
            {action_id: 'act_tips_email', state: 'done', occurred_at: '2026-07-03T08:16:00Z', detail: 'Opened'},
            {action_id: 'act_week1_email', state: 'done', occurred_at: '2026-07-07T08:16:00Z', detail: 'Opened · clicked 1 link'}
        ]
    },
    {
        id: 'run_noah', automation_id: welcomeSeries.id,
        member: {id: 'mem_noah', name: 'Noah Bennett', email: 'noah.bennett@example.com'},
        status: 'in_progress', enrolled_at: '2026-07-20T18:03:00Z', completed_at: null,
        current_action_id: 'act_wait_3d', exit_reason: null,
        steps: [
            {action_id: 'act_welcome_email', state: 'done', occurred_at: '2026-07-20T18:03:00Z', detail: 'Delivered'},
            {action_id: 'act_wait_3d', state: 'current', occurred_at: '2026-07-20T18:04:00Z', detail: 'Waiting — resumes Jul 23'},
            {action_id: 'act_tips_email', state: 'upcoming', occurred_at: null, detail: null},
            {action_id: 'act_week1_email', state: 'upcoming', occurred_at: null, detail: null}
        ]
    }
];

// --- Inactive win-back (early drop-off) -----------------------------------

const winbackMetrics: AutomationRunMetrics = {
    automation_id: inactiveWinback.id,
    enrollments: 640,
    in_progress: 40,
    completed: 210,
    exited_early: 390,
    last_enrolled_at: '2026-07-20T22:41:00Z',
    enrollments_by_day: daysSeries('2026-07-21', [30, 26, 22, 18, 24, 19, 14, 21, 17, 12, 20, 16, 11, 18, 14, 9, 15, 12, 8, 13, 10, 7, 14, 11, 6, 12, 9, 5, 10, 8])
};

const winbackRuns: AutomationRun[] = [
    {
        id: 'run_ivy', automation_id: inactiveWinback.id,
        member: {id: 'mem_ivy', name: 'Ivy Sanders', email: 'ivy.sanders@example.com'},
        status: 'exited_early', enrolled_at: '2026-07-14T09:00:00Z', completed_at: null,
        current_action_id: null, exit_reason: 'Unsubscribed',
        steps: [
            {action_id: 'act_wb_hey', state: 'done', occurred_at: '2026-07-14T09:00:00Z', detail: 'Unsubscribed'},
            {action_id: 'act_wb_wait', state: 'skipped', occurred_at: null, detail: null},
            {action_id: 'act_wb_offer', state: 'skipped', occurred_at: null, detail: null}
        ]
    },
    {
        id: 'run_leo', automation_id: inactiveWinback.id,
        member: {id: 'mem_leo', name: 'Leo Martins', email: 'leo.martins@example.com'},
        status: 'completed', enrolled_at: '2026-07-05T12:30:00Z', completed_at: '2026-07-13T12:35:00Z',
        current_action_id: null, exit_reason: null,
        steps: [
            {action_id: 'act_wb_hey', state: 'done', occurred_at: '2026-07-05T12:30:00Z', detail: 'Opened'},
            {action_id: 'act_wb_wait', state: 'done', occurred_at: '2026-07-05T12:31:00Z', detail: 'Waited 7 days'},
            {action_id: 'act_wb_offer', state: 'done', occurred_at: '2026-07-12T12:31:00Z', detail: 'Opened · clicked 1 link'}
        ]
    },
    {
        id: 'run_ada', automation_id: inactiveWinback.id,
        member: {id: 'mem_ada', name: 'Ada Flores', email: 'ada.flores@example.com'},
        status: 'in_progress', enrolled_at: '2026-07-19T16:10:00Z', completed_at: null,
        current_action_id: 'act_wb_wait', exit_reason: null,
        steps: [
            {action_id: 'act_wb_hey', state: 'done', occurred_at: '2026-07-19T16:10:00Z', detail: 'Delivered — not opened'},
            {action_id: 'act_wb_wait', state: 'current', occurred_at: '2026-07-19T16:11:00Z', detail: 'Waiting — resumes Jul 26'},
            {action_id: 'act_wb_offer', state: 'upcoming', occurred_at: null, detail: null}
        ]
    }
];

// --- Paid upgrade nudge (steady state) ------------------------------------

const upgradeMetrics: AutomationRunMetrics = {
    automation_id: paidUpgradeNudge.id,
    enrollments: 412,
    in_progress: 61,
    completed: 320,
    exited_early: 31,
    last_enrolled_at: '2026-07-21T05:55:00Z',
    enrollments_by_day: daysSeries('2026-07-21', [8, 11, 9, 13, 10, 7, 12, 15, 11, 9, 14, 12, 8, 13, 16, 10, 12, 9, 15, 11, 8, 13, 10, 14, 12, 9, 16, 11, 13, 10])
};

const upgradeRuns: AutomationRun[] = [
    {
        id: 'run_mila', automation_id: paidUpgradeNudge.id,
        member: {id: 'mem_mila', name: 'Mila Cho', email: 'mila.cho@example.com'},
        status: 'completed', enrolled_at: '2026-07-09T10:00:00Z', completed_at: '2026-07-14T10:05:00Z',
        current_action_id: null, exit_reason: null,
        steps: [
            {action_id: 'act_up_email', state: 'done', occurred_at: '2026-07-09T10:00:00Z', detail: 'Opened · clicked 1 link'},
            {action_id: 'act_up_wait', state: 'done', occurred_at: '2026-07-09T10:01:00Z', detail: 'Waited 5 days'},
            {action_id: 'act_up_email2', state: 'done', occurred_at: '2026-07-14T10:01:00Z', detail: 'Opened'}
        ]
    },
    {
        id: 'run_ben', automation_id: paidUpgradeNudge.id,
        member: {id: 'mem_ben', name: 'Ben Ortiz', email: 'ben.ortiz@example.com'},
        status: 'exited_early', enrolled_at: '2026-07-16T14:20:00Z', completed_at: null,
        current_action_id: null, exit_reason: 'Upgraded to paid',
        steps: [
            {action_id: 'act_up_email', state: 'done', occurred_at: '2026-07-16T14:20:00Z', detail: 'Opened · upgraded'},
            {action_id: 'act_up_wait', state: 'skipped', occurred_at: null, detail: null},
            {action_id: 'act_up_email2', state: 'skipped', occurred_at: null, detail: null}
        ]
    }
];

// --- Registry + accessor ---------------------------------------------------

const runData: Record<string, RunData> = {
    [welcomeSeries.id]: {metrics: welcomeMetrics, runs: welcomeRuns},
    [inactiveWinback.id]: {metrics: winbackMetrics, runs: winbackRuns},
    [paidUpgradeNudge.id]: {metrics: upgradeMetrics, runs: upgradeRuns}
    // cancellationSurvey intentionally absent → empty state
};

function emptyMetrics(automationId: string): AutomationRunMetrics {
    return {
        automation_id: automationId,
        enrollments: 0,
        in_progress: 0,
        completed: 0,
        exited_early: 0,
        last_enrolled_at: null,
        enrollments_by_day: daysSeries('2026-07-21', Array.from({length: 30}, () => 0))
    };
}

/** The full scenario for an automation, or `undefined` if the id is unknown. */
export function getScenario(id: string): AutomationScenario | undefined {
    const automation = getAutomation(id);
    if (!automation) {
        return undefined;
    }
    const data = runData[id] ?? {metrics: emptyMetrics(id), runs: []};
    return {automation, metrics: data.metrics, runs: data.runs};
}

// Referenced so the empty-state scenario reads as intentional, not forgotten.
export const emptyScenarioId = cancellationSurvey.id;
