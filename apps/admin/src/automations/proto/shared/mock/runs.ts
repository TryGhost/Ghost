import type {AutomationRun, AutomationRunMetrics, AutomationScenario, EnrollmentPoint, RunStep} from './types';
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

// ---------------------------------------------------------------------------
// Run expansion — each scenario above is hand-authored with a handful of runs,
// one per interesting shape (in-progress, completed, exited-early, etc.), so
// they're easy to reason about individually. Real automations run against
// thousands of members, so a list of 3-5 reads as too sparse to get a feel for
// scanning/searching/selecting at scale. expandRuns pads a scenario's runs out
// to `targetCount` by re-cycling the hand-authored ones onto new member
// identities (shifting their timestamps back in history) — it's fine, even
// expected, for these synthetic members to repeat the same journeys.
// ---------------------------------------------------------------------------

const NAME_POOL: {first: string; last: string}[] = [
    {first: 'Owen', last: 'Brooks'}, {first: 'Maya', last: 'Chen'}, {first: 'Diego', last: 'Ramirez'},
    {first: 'Freya', last: 'Nilsson'}, {first: 'Kwame', last: 'Asante'}, {first: 'Lucia', last: 'Moreno'},
    {first: 'Ravi', last: 'Patel'}, {first: 'Aisling', last: 'Byrne'}, {first: 'Hana', last: 'Kobayashi'},
    {first: 'Theo', last: 'Marchetti'}, {first: 'Zara', last: 'Hussain'}, {first: 'Callum', last: 'Fraser'},
    {first: 'Amara', last: 'Okonkwo'}, {first: 'Felix', last: 'Bauer'}, {first: 'Nadia', last: 'Petrova'},
    {first: 'Silas', last: 'Thorne'}, {first: 'Elin', last: 'Karlsson'}, {first: 'Jonah', last: 'Whitfield'},
    {first: 'Priyanka', last: 'Rao'}, {first: 'Micah', last: 'Reyes'}, {first: 'Saoirse', last: 'Kelly'},
    {first: 'Dimitri', last: 'Volkov'}, {first: 'Lena', last: 'Novak'}, {first: 'Amir', last: 'Farouk'}
];

function buildSyntheticMember(automationId: string, index: number): AutomationRun['member'] {
    const {first, last} = NAME_POOL[index % NAME_POOL.length];
    // Once the pool wraps, suffix the name/email so repeats stay visibly distinct.
    const cycle = Math.floor(index / NAME_POOL.length);
    const name = cycle > 0 ? `${first} ${last} ${cycle + 1}` : `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${cycle > 0 ? cycle + 1 : ''}@example.com`;
    return {id: `mem_${automationId}_${index}`, name, email};
}

/** Shift an ISO timestamp back by `days`, or pass through null. */
function shiftIso(iso: string | null, days: number): string | null {
    if (!iso) {
        return null;
    }
    const d = new Date(iso);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString();
}

// Failures don't clone. Everything else about a template repeats happily —
// synthetic members retracing the same journey is the point — but a delivery
// failure is meant to be the rare one you have to go looking for, and cloning the
// template that carries it turned every exited run in the scenario into a broken
// send. So a clone of a failed template gets an ordinary member-driven exit
// instead, and its step loses the flag that marks which send broke.
function cloneStep(step: RunStep, days: number): RunStep {
    const next: RunStep = {...step, occurred_at: shiftIso(step.occurred_at, days), detail: step.failed ? 'Unsubscribed' : step.detail};
    delete next.failed;
    return next;
}

function cloneRunForMember(template: AutomationRun, automationId: string, index: number): AutomationRun {
    // Push each synthetic run further back in history than the last, so the
    // list reads as an ongoing history rather than a pile of same-day runs.
    const days = 14 + index * 3;
    const failedTemplate = template.steps.some(step => step.failed);
    return {
        ...template,
        id: `run_${automationId}_${index}`,
        automation_id: automationId,
        member: buildSyntheticMember(automationId, index),
        exit_reason: failedTemplate ? 'unsubscribed' : template.exit_reason,
        enrolled_at: shiftIso(template.enrolled_at, days)!,
        completed_at: shiftIso(template.completed_at, days),
        steps: template.steps.map(step => cloneStep(step, days))
    };
}

/** Pads `baseRuns` out to `targetCount` by re-cycling them onto new members. */
function expandRuns(automationId: string, baseRuns: AutomationRun[], targetCount: number): AutomationRun[] {
    if (baseRuns.length === 0 || targetCount <= baseRuns.length) {
        return baseRuns;
    }
    const synthetic = Array.from(
        {length: targetCount - baseRuns.length},
        (_, i) => cloneRunForMember(baseRuns[i % baseRuns.length], automationId, i)
    );
    return [...baseRuns, ...synthetic];
}

const RUNS_PER_SCENARIO = 22;

// --- Welcome series (healthy) ---------------------------------------------

const welcomeMetrics: AutomationRunMetrics = {
    automation_id: welcomeSeries.id,
    enrollments: 1432,
    in_progress: 118,
    completed: 1225,
    exited_early: 89,
    last_enrolled_at: '2026-07-21T07:12:00Z',
    enrollments_by_day: daysSeries('2026-07-21', [18, 20, 21, 23, 22, 25, 27, 26, 29, 31, 30, 32, 33, 34, 33, 35, 36, 35, 34, 33, 31, 32, 30, 29, 30, 28, 27, 28, 26, 27])
};

const welcomeRunsBase: AutomationRun[] = [
    {
        id: 'run_sarah', automation_id: welcomeSeries.id,
        member: {id: 'mem_sarah', name: 'Sarah Lin', email: 'sarah.lin@example.com'},
        status: 'in_progress', enrolled_at: '2026-07-12T09:04:00Z', completed_at: null,
        current_action_id: 'act_tips_email', exit_reason: null,
        steps: [
            {action_id: 'act_welcome_email', state: 'done', occurred_at: '2026-07-12T09:04:00Z', detail: 'Opened (1 link)'},
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
            {action_id: 'act_tips_email', state: 'done', occurred_at: '2026-07-11T15:23:00Z', detail: 'Opened (2 links)'},
            {action_id: 'act_week1_email', state: 'done', occurred_at: '2026-07-14T15:23:00Z', detail: 'Opened'}
        ]
    },
    {
        id: 'run_priya', automation_id: welcomeSeries.id,
        member: {id: 'mem_priya', name: 'Priya Nair', email: 'priya.nair@example.com'},
        status: 'exited_early', enrolled_at: '2026-07-10T11:47:00Z', completed_at: null,
        current_action_id: null, exit_reason: 'unsubscribed',
        steps: [
            {action_id: 'act_welcome_email', state: 'done', occurred_at: '2026-07-10T11:47:00Z', detail: 'Unsubscribed'},
            {action_id: 'act_wait_3d', state: 'skipped', occurred_at: null, detail: null},
            {action_id: 'act_tips_email', state: 'skipped', occurred_at: null, detail: null},
            {action_id: 'act_week1_email', state: 'skipped', occurred_at: null, detail: null}
        ]
    },
    {
        // The publisher turned the automation off while this member was partway
        // through. Seeded rather than generated — turning an automation off in the
        // proto doesn't retire its in-flight runs — so the state is reviewable
        // without the behaviour existing.
        id: 'run_dara', automation_id: welcomeSeries.id,
        member: {id: 'mem_dara', name: 'Dara Whitfield', email: 'dara.whitfield@example.com'},
        status: 'exited_early', enrolled_at: '2026-07-09T16:02:00Z', completed_at: null,
        current_action_id: null, exit_reason: 'ended_by_publisher',
        steps: [
            {action_id: 'act_welcome_email', state: 'done', occurred_at: '2026-07-09T16:02:00Z', detail: 'Opened'},
            {action_id: 'act_wait_3d', state: 'done', occurred_at: '2026-07-09T16:03:00Z', detail: 'Waited 3 days'},
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
            {action_id: 'act_week1_email', state: 'done', occurred_at: '2026-07-07T08:16:00Z', detail: 'Opened (1 link)'}
        ]
    },
    {
        // Just enrolled (minutes ago) — the fresh end of the "started" range.
        id: 'run_noah', automation_id: welcomeSeries.id,
        member: {id: 'mem_noah', name: 'Noah Bennett', email: 'noah.bennett@example.com'},
        status: 'in_progress', enrolled_at: '2026-07-21T09:06:00Z', completed_at: null,
        current_action_id: 'act_wait_3d', exit_reason: null,
        steps: [
            {action_id: 'act_welcome_email', state: 'done', occurred_at: '2026-07-21T09:06:00Z', detail: 'Delivered'},
            {action_id: 'act_wait_3d', state: 'current', occurred_at: '2026-07-21T09:07:00Z', detail: 'Resumes Jul 24'},
            {action_id: 'act_tips_email', state: 'upcoming', occurred_at: null, detail: null},
            {action_id: 'act_week1_email', state: 'upcoming', occurred_at: null, detail: null}
        ]
    },
    {
        // Enrolled a few hours ago — the middle of the range.
        id: 'run_elena', automation_id: welcomeSeries.id,
        member: {id: 'mem_elena', name: 'Elena Ross', email: 'elena.ross@example.com'},
        status: 'in_progress', enrolled_at: '2026-07-21T05:20:00Z', completed_at: null,
        current_action_id: 'act_wait_3d', exit_reason: null,
        steps: [
            {action_id: 'act_welcome_email', state: 'done', occurred_at: '2026-07-21T05:20:00Z', detail: 'Opened'},
            {action_id: 'act_wait_3d', state: 'current', occurred_at: '2026-07-21T05:21:00Z', detail: 'Resumes Jul 24'},
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
    enrollments_by_day: daysSeries('2026-07-21', [30, 29, 27, 26, 24, 23, 21, 20, 19, 17, 16, 16, 15, 14, 13, 13, 12, 11, 11, 10, 10, 9, 9, 8, 8, 8, 7, 7, 8, 7])
};

const winbackRunsBase: AutomationRun[] = [
    {
        id: 'run_ivy', automation_id: inactiveWinback.id,
        member: {id: 'mem_ivy', name: 'Ivy Sanders', email: 'ivy.sanders@example.com'},
        // The one failure case in the fixtures: the send itself broke, so the run
        // ended without the member doing anything. Still exited_early — they're out
        // of the flow — with an exit_reason that names the system, not them.
        status: 'exited_early', enrolled_at: '2026-07-14T09:00:00Z', completed_at: null,
        current_action_id: null, exit_reason: 'failed',
        steps: [
            {action_id: 'act_wb_hey', state: 'done', occurred_at: '2026-07-14T09:00:00Z', detail: 'Member inbox is full', failed: true},
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
            {action_id: 'act_wb_offer', state: 'done', occurred_at: '2026-07-12T12:31:00Z', detail: 'Opened (1 link)'}
        ]
    },
    {
        // Enrolled minutes ago — the fresh end of the range.
        id: 'run_ada', automation_id: inactiveWinback.id,
        member: {id: 'mem_ada', name: 'Ada Flores', email: 'ada.flores@example.com'},
        status: 'in_progress', enrolled_at: '2026-07-21T08:32:00Z', completed_at: null,
        current_action_id: 'act_wb_wait', exit_reason: null,
        steps: [
            {action_id: 'act_wb_hey', state: 'done', occurred_at: '2026-07-21T08:32:00Z', detail: 'Delivered, not opened'},
            {action_id: 'act_wb_wait', state: 'current', occurred_at: '2026-07-21T08:33:00Z', detail: 'Resumes Jul 28'},
            {action_id: 'act_wb_offer', state: 'upcoming', occurred_at: null, detail: null}
        ]
    },
    {
        // Enrolled a few hours ago — the middle of the range.
        id: 'run_omar', automation_id: inactiveWinback.id,
        member: {id: 'mem_omar', name: 'Omar Haddad', email: 'omar.haddad@example.com'},
        status: 'in_progress', enrolled_at: '2026-07-21T03:45:00Z', completed_at: null,
        current_action_id: 'act_wb_wait', exit_reason: null,
        steps: [
            {action_id: 'act_wb_hey', state: 'done', occurred_at: '2026-07-21T03:45:00Z', detail: 'Opened'},
            {action_id: 'act_wb_wait', state: 'current', occurred_at: '2026-07-21T03:46:00Z', detail: 'Resumes Jul 28'},
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
    enrollments_by_day: daysSeries('2026-07-21', [9, 10, 10, 11, 11, 12, 11, 12, 13, 12, 13, 13, 12, 13, 14, 13, 13, 12, 13, 13, 12, 13, 14, 13, 13, 12, 13, 14, 13, 13])
};

const upgradeRunsBase: AutomationRun[] = [
    {
        id: 'run_mila', automation_id: paidUpgradeNudge.id,
        member: {id: 'mem_mila', name: 'Mila Cho', email: 'mila.cho@example.com'},
        status: 'completed', enrolled_at: '2026-07-09T10:00:00Z', completed_at: '2026-07-14T10:05:00Z',
        current_action_id: null, exit_reason: null,
        steps: [
            {action_id: 'act_up_email', state: 'done', occurred_at: '2026-07-09T10:00:00Z', detail: 'Opened (1 link)'},
            {action_id: 'act_up_wait', state: 'done', occurred_at: '2026-07-09T10:01:00Z', detail: 'Waited 5 days'},
            {action_id: 'act_up_email2', state: 'done', occurred_at: '2026-07-14T10:01:00Z', detail: 'Opened'}
        ]
    },
    {
        id: 'run_ben', automation_id: paidUpgradeNudge.id,
        member: {id: 'mem_ben', name: 'Ben Ortiz', email: 'ben.ortiz@example.com'},
        status: 'exited_early', enrolled_at: '2026-07-16T14:20:00Z', completed_at: null,
        current_action_id: null, exit_reason: 'upgraded',
        steps: [
            {action_id: 'act_up_email', state: 'done', occurred_at: '2026-07-16T14:20:00Z', detail: 'Opened (upgraded)'},
            {action_id: 'act_up_wait', state: 'skipped', occurred_at: null, detail: null},
            {action_id: 'act_up_email2', state: 'skipped', occurred_at: null, detail: null}
        ]
    },
    {
        // Enrolled minutes ago — also the only in-progress shape in this scenario.
        id: 'run_yuki', automation_id: paidUpgradeNudge.id,
        member: {id: 'mem_yuki', name: 'Yuki Tanaka', email: 'yuki.tanaka@example.com'},
        status: 'in_progress', enrolled_at: '2026-07-21T09:01:00Z', completed_at: null,
        current_action_id: 'act_up_wait', exit_reason: null,
        steps: [
            {action_id: 'act_up_email', state: 'done', occurred_at: '2026-07-21T09:01:00Z', detail: 'Opened'},
            {action_id: 'act_up_wait', state: 'current', occurred_at: '2026-07-21T09:02:00Z', detail: 'Resumes Jul 26'},
            {action_id: 'act_up_email2', state: 'upcoming', occurred_at: null, detail: null}
        ]
    },
    {
        // Enrolled a few hours ago — the middle of the range.
        id: 'run_diego', automation_id: paidUpgradeNudge.id,
        member: {id: 'mem_diego_up', name: 'Diego Salas', email: 'diego.salas@example.com'},
        status: 'in_progress', enrolled_at: '2026-07-21T02:10:00Z', completed_at: null,
        current_action_id: 'act_up_wait', exit_reason: null,
        steps: [
            {action_id: 'act_up_email', state: 'done', occurred_at: '2026-07-21T02:10:00Z', detail: 'Opened (1 link)'},
            {action_id: 'act_up_wait', state: 'current', occurred_at: '2026-07-21T02:11:00Z', detail: 'Resumes Jul 26'},
            {action_id: 'act_up_email2', state: 'upcoming', occurred_at: null, detail: null}
        ]
    }
];

const welcomeRuns = expandRuns(welcomeSeries.id, welcomeRunsBase, RUNS_PER_SCENARIO);
const winbackRuns = expandRuns(inactiveWinback.id, winbackRunsBase, RUNS_PER_SCENARIO);
const upgradeRuns = expandRuns(paidUpgradeNudge.id, upgradeRunsBase, RUNS_PER_SCENARIO);

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
