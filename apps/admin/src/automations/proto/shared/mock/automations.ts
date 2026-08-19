import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';

// ---------------------------------------------------------------------------
// Automation definitions — BORROWED shape.
//
// These are real AutomationDetail objects (same type the engineers build with).
// Ids are readable here for design clarity; in real data they're 24-char
// ObjectIds. Descriptions live in a slug-keyed map, mirroring the real feature
// (they aren't part of the automation data model).
// ---------------------------------------------------------------------------

export const AUTOMATION_DESCRIPTIONS: Record<string, string> = {
    'welcome-series': 'Greet new members with a short onboarding sequence.',
    'inactive-winback': 'Re-engage members who have gone quiet.',
    'paid-upgrade-nudge': 'Nudge engaged free members toward a paid plan.',
    'cancellation-survey': 'Ask departing members why they cancelled.'
};

const EMPTY_LEXICAL = '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
const DESIGN = 'ds_default';

// Healthy scenario — strong completion, a mix of run states.
export const welcomeSeries: AutomationDetail = {
    id: 'auto_welcome',
    name: 'Welcome series',
    slug: 'welcome-series',
    status: 'active',
    created_at: '2026-06-01T09:00:00Z',
    updated_at: '2026-07-18T14:12:00Z',
    actions: [
        {id: 'act_welcome_email', type: 'send_email', data: {email_subject: 'Welcome to the club', email_lexical: EMPTY_LEXICAL, email_design_setting_id: DESIGN},
            stats: {email_sent_count: 1432, email_opened_count: 1190, email_clicked_count: 301, opened_rate: 83, clicked_rate: 21}},
        {id: 'act_wait_3d', type: 'wait', data: {wait_hours: 72}},
        {id: 'act_tips_email', type: 'send_email', data: {email_subject: 'Getting the most out of it', email_lexical: EMPTY_LEXICAL, email_design_setting_id: DESIGN},
            stats: {email_sent_count: 1314, email_opened_count: 998, email_clicked_count: 237, opened_rate: 76, clicked_rate: 18}},
        {id: 'act_week1_email', type: 'send_email', data: {email_subject: 'One week in', email_lexical: EMPTY_LEXICAL, email_design_setting_id: DESIGN},
            stats: {email_sent_count: 1225, email_opened_count: 870, email_clicked_count: 184, opened_rate: 71, clicked_rate: 15}}
    ],
    edges: [
        {source_action_id: 'act_welcome_email', target_action_id: 'act_wait_3d'},
        {source_action_id: 'act_wait_3d', target_action_id: 'act_tips_email'},
        {source_action_id: 'act_tips_email', target_action_id: 'act_week1_email'}
    ]
};

// Early drop-off scenario — high exit rate, weak engagement.
export const inactiveWinback: AutomationDetail = {
    id: 'auto_winback',
    name: 'Inactive win-back',
    slug: 'inactive-winback',
    status: 'active',
    created_at: '2026-05-12T10:00:00Z',
    updated_at: '2026-07-09T11:30:00Z',
    actions: [
        {id: 'act_wb_hey', type: 'send_email', data: {email_subject: 'We miss you', email_lexical: EMPTY_LEXICAL, email_design_setting_id: DESIGN},
            stats: {email_sent_count: 640, email_opened_count: 205, email_clicked_count: 38, opened_rate: 32, clicked_rate: 6}},
        {id: 'act_wb_wait', type: 'wait', data: {wait_hours: 168}},
        {id: 'act_wb_offer', type: 'send_email', data: {email_subject: 'Here’s 20% off to come back', email_lexical: EMPTY_LEXICAL, email_design_setting_id: DESIGN},
            stats: {email_sent_count: 250, email_opened_count: 88, email_clicked_count: 22, opened_rate: 35, clicked_rate: 9}}
    ],
    edges: [
        {source_action_id: 'act_wb_hey', target_action_id: 'act_wb_wait'},
        {source_action_id: 'act_wb_wait', target_action_id: 'act_wb_offer'}
    ]
};

// Steady-state scenario — moderate, healthy-ish numbers.
export const paidUpgradeNudge: AutomationDetail = {
    id: 'auto_upgrade',
    name: 'Paid upgrade nudge',
    slug: 'paid-upgrade-nudge',
    status: 'active',
    created_at: '2026-06-20T08:00:00Z',
    updated_at: '2026-07-15T16:45:00Z',
    actions: [
        {id: 'act_up_email', type: 'send_email', data: {email_subject: 'Ready for more?', email_lexical: EMPTY_LEXICAL, email_design_setting_id: DESIGN},
            stats: {email_sent_count: 412, email_opened_count: 289, email_clicked_count: 99, opened_rate: 70, clicked_rate: 24}},
        {id: 'act_up_wait', type: 'wait', data: {wait_hours: 120}},
        {id: 'act_up_email2', type: 'send_email', data: {email_subject: 'A little nudge', email_lexical: EMPTY_LEXICAL, email_design_setting_id: DESIGN},
            stats: {email_sent_count: 361, email_opened_count: 235, email_clicked_count: 69, opened_rate: 65, clicked_rate: 19}}
    ],
    edges: [
        {source_action_id: 'act_up_email', target_action_id: 'act_up_wait'},
        {source_action_id: 'act_up_wait', target_action_id: 'act_up_email2'}
    ]
};

// Empty / brand-new scenario — published, but nobody has enrolled yet. Stats
// omitted (no data). Powers the empty-state design.
export const cancellationSurvey: AutomationDetail = {
    id: 'auto_cancellation',
    name: 'Cancellation survey',
    slug: 'cancellation-survey',
    status: 'inactive',
    created_at: '2026-07-20T13:00:00Z',
    updated_at: '2026-07-20T13:00:00Z',
    actions: [
        {id: 'act_cs_email', type: 'send_email', data: {email_subject: 'Sorry to see you go', email_lexical: EMPTY_LEXICAL, email_design_setting_id: DESIGN}}
    ],
    edges: []
};

export const mockAutomations: AutomationDetail[] = [
    welcomeSeries,
    inactiveWinback,
    paidUpgradeNudge,
    cancellationSurvey
];

export function getAutomation(id: string): AutomationDetail | undefined {
    return mockAutomations.find(a => a.id === id);
}
