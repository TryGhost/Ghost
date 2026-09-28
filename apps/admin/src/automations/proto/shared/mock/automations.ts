import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';

// ---------------------------------------------------------------------------
// Automation definitions — BORROWED shape.
//
// These are real AutomationDetail objects (same type the engineers build with).
// Ids are readable here for design clarity; in real data they're 24-char
// ObjectIds.
//
// Descriptions are a slug-keyed map here because these are fixtures and the API
// type has no field for them. They SEED the store and are not read again — a
// description is editable now (phase-2's settings dialog), so the record owns it
// from first load. Which makes the field an ask for the real schema: the list
// shows it, publishers write it, and AutomationDetail has nowhere to put it.
// ---------------------------------------------------------------------------

export const AUTOMATION_DESCRIPTIONS: Record<string, string> = {
  'member-welcome-email-free': 'Greet new free members with a short onboarding sequence.',
  'member-welcome-email-paid': 'Welcome members who have just started paying.',
  'lead-magnet-seo-guide': 'Deliver the SEO guide to everyone who signs up for it.',
  'winback-subscription-ended': 'Ask members who have lapsed whether they want to come back.',
  'segment-engaged-upsell': 'Pitch a paid membership to free members who keep reading.',
};

// What phase 1 lists.
//
// Every fixture qualifies today — the invented ones are gone and only production's
// real two are left, so this filters nothing. It stays because phase 2 and the
// explorations are where new trigger types get tried, and the first one added will be
// an automation a real site can't have. Phase 1 is the lane being built; it shows
// what ships.
//
// Names and slugs are production's own (see ghost/core member-welcome-emails/
// constants and the 6.46 rename migration). A site has exactly these two and no way
// to make a third — there's no trigger column in the schema, so which member a flow
// is for IS its slug.
export const PHASE_1_SLUGS: readonly string[] = [
  'member-welcome-email-free',
  'member-welcome-email-paid',
];

// One written paragraph, so a seeded email is distinguishable from one nobody has
// touched. The canvas keys its empty state off whether email_lexical has children
// (see email-preview's lexicalHasContent) — these fixtures are established emails on
// a real site, so they have to carry SOMETHING or every card would open saying
// "Begin writing". The preview still shows its own stand-in copy; this text is
// never rendered.
//
// Exported (with EMPTY_LEXICAL) because the content dialog's simulate toggle
// writes exactly these two values: the proto can't author lexical, so "has
// content" and "hasn't" are these constants and nothing else.
export const SEEDED_LEXICAL =
  '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Thanks for joining — here’s what to expect next, straight to your inbox.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';
// The same empty doc a brand-new email is born with (see the framework's
// buildSendEmailAction) — an empty root, not an empty string.
export const EMPTY_LEXICAL =
  '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
const DESIGN = 'ds_default';

// Healthy scenario — strong completion, a mix of run states.
//
// Production's free welcome flow, by its real name and slug. Left ACTIVE despite
// production shipping both defaults inactive: an off automation has no runs, and a
// list where nothing has run is a poor way to look at run analytics. The status a
// site starts with is a fact about onboarding; this fixture is here to be read.
export const welcomeSeries: AutomationDetail = {
  id: 'auto_welcome',
  name: 'Free member welcome flow',
  slug: 'member-welcome-email-free',
  status: 'active',
  created_at: '2026-06-01T09:00:00Z',
  updated_at: '2026-07-18T14:12:00Z',
  actions: [
    {
      id: 'act_welcome_email',
      type: 'send_email',
      data: {
        email_subject: 'Welcome to the club',
        email_lexical: SEEDED_LEXICAL,
        email_design_setting_id: DESIGN,
      },
      stats: {
        email_sent_count: 1432,
        email_opened_count: 1190,
        email_clicked_count: 301,
        opened_rate: 83,
        clicked_rate: 21,
      },
    },
    { id: 'act_wait_3d', type: 'wait', data: { wait_hours: 72 } },
    {
      id: 'act_tips_email',
      type: 'send_email',
      data: {
        email_subject: 'Getting the most out of it',
        email_lexical: SEEDED_LEXICAL,
        email_design_setting_id: DESIGN,
      },
      stats: {
        email_sent_count: 1314,
        email_opened_count: 998,
        email_clicked_count: 237,
        opened_rate: 76,
        clicked_rate: 18,
      },
    },
    {
      id: 'act_week1_email',
      type: 'send_email',
      data: {
        email_subject: 'One week in',
        email_lexical: SEEDED_LEXICAL,
        email_design_setting_id: DESIGN,
      },
      stats: {
        email_sent_count: 1225,
        email_opened_count: 870,
        email_clicked_count: 184,
        opened_rate: 71,
        clicked_rate: 15,
      },
    },
  ],
  edges: [
    { source_action_id: 'act_welcome_email', target_action_id: 'act_wait_3d' },
    { source_action_id: 'act_wait_3d', target_action_id: 'act_tips_email' },
    { source_action_id: 'act_tips_email', target_action_id: 'act_week1_email' },
  ],
};

// Steady-state scenario — moderate, healthy-ish numbers.
//
// Production's paid welcome flow. The export keeps its old name so the run fixtures
// and scenario map don't all have to move for a relabel; the id is what those key on.
//
// Worth knowing what this one glosses over: production's paid flow fires for members
// whose status is `paid` OR `gift` (MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES), and the
// proto has no notion of a gifted membership anywhere.
export const paidUpgradeNudge: AutomationDetail = {
  id: 'auto_upgrade',
  name: 'Paid member welcome flow',
  slug: 'member-welcome-email-paid',
  status: 'active',
  created_at: '2026-06-20T08:00:00Z',
  updated_at: '2026-07-15T16:45:00Z',
  actions: [
    {
      id: 'act_up_email',
      type: 'send_email',
      data: {
        email_subject: 'Ready for more?',
        email_lexical: SEEDED_LEXICAL,
        email_design_setting_id: DESIGN,
      },
      stats: {
        email_sent_count: 412,
        email_opened_count: 289,
        email_clicked_count: 99,
        opened_rate: 70,
        clicked_rate: 24,
      },
    },
    { id: 'act_up_wait', type: 'wait', data: { wait_hours: 120 } },
    {
      id: 'act_up_email2',
      type: 'send_email',
      data: {
        email_subject: 'A little nudge',
        email_lexical: SEEDED_LEXICAL,
        email_design_setting_id: DESIGN,
      },
      stats: {
        email_sent_count: 361,
        email_opened_count: 235,
        email_clicked_count: 69,
        opened_rate: 65,
        clicked_rate: 19,
      },
    },
  ],
  edges: [
    { source_action_id: 'act_up_email', target_action_id: 'act_up_wait' },
    { source_action_id: 'act_up_wait', target_action_id: 'act_up_email2' },
  ],
};

// Lead magnet — the FUTURE lane's fixture, and the first automation here that a
// Ghost site cannot make today.
//
// It exists to answer "what is the label trigger FOR" without anyone having to
// build one: a signup form on a landing page attaches the "SEO guide" label,
// this delivers the guide, and a few days later asks whether it helped. That
// second email is the part worth seeing — a lead magnet that only hands over the
// file is a transaction, and the follow-up is where it becomes a sequence.
//
// Kept out of every other lane by its TRIGGER, not by a list of slugs: nothing
// but the future lane offers `label_added`, so nothing else shows this. See
// shared/capabilities.
//
// The slug is invented — production has no such automation — but it carries one
// so the description map seeds it the way the other two are seeded.
//
// Numbers read like a lead magnet rather than a newsletter: the delivery email
// is opened and clicked by almost everyone, because the click IS the download
// and they asked for it a minute ago. The follow-up falls back to ordinary
// rates. A flat 70% on both would be the giveaway that nobody thought about it.
export const leadMagnetDelivery: AutomationDetail = {
  id: 'auto_lead_magnet',
  name: 'SEO guide delivery',
  slug: 'lead-magnet-seo-guide',
  status: 'active',
  created_at: '2026-06-28T11:00:00Z',
  updated_at: '2026-07-19T09:30:00Z',
  actions: [
    {
      id: 'act_lm_deliver',
      type: 'send_email',
      data: {
        email_subject: 'Your SEO guide is here',
        email_lexical: SEEDED_LEXICAL,
        email_design_setting_id: DESIGN,
      },
      stats: {
        email_sent_count: 640,
        email_opened_count: 585,
        email_clicked_count: 470,
        opened_rate: 91,
        clicked_rate: 73,
      },
    },
    { id: 'act_lm_wait', type: 'wait', data: { wait_hours: 72 } },
    {
      id: 'act_lm_followup',
      type: 'send_email',
      data: {
        email_subject: 'Did the guide help?',
        email_lexical: SEEDED_LEXICAL,
        email_design_setting_id: DESIGN,
      },
      stats: {
        email_sent_count: 598,
        email_opened_count: 383,
        email_clicked_count: 96,
        opened_rate: 64,
        clicked_rate: 16,
      },
    },
  ],
  edges: [
    { source_action_id: 'act_lm_deliver', target_action_id: 'act_lm_wait' },
    { source_action_id: 'act_lm_wait', target_action_id: 'act_lm_followup' },
  ],
};

// Winback — the FUTURE lane's lifecycle fixture.
//
// Fires on a subscription ENDING, which is deliberately more than cancelling:
// a card that stops working and a membership that lapses at period end both
// land here, and they're most of who a winback is actually for (see
// SubscriptionChange).
//
// A slow flow on purpose. The welcome flows wait 3 and 5 days because someone
// who just arrived is still paying attention; a lapsed member is not, and
// following them out the door the same afternoon reads as pleading. Two weeks,
// then three more.
//
// The numbers are the bleakest in the fixture set, and should be: a winback that
// converted like a welcome email would be a winback nobody needs. Opens hold up
// (the subject is about them), clicks fall off a cliff, and the flow's real
// result is the 11% who exit by starting to pay again — which is the run list's
// job to show, not the email stats'.
export const winbackLapsed: AutomationDetail = {
  id: 'auto_winback',
  name: 'Winback lapsed members',
  slug: 'winback-subscription-ended',
  status: 'active',
  created_at: '2026-06-14T10:00:00Z',
  updated_at: '2026-07-16T12:20:00Z',
  actions: [
    { id: 'act_wb_wait', type: 'wait', data: { wait_hours: 336 } },
    {
      id: 'act_wb_email',
      type: 'send_email',
      data: {
        email_subject: 'Was it something we said?',
        email_lexical: SEEDED_LEXICAL,
        email_design_setting_id: DESIGN,
      },
      stats: {
        email_sent_count: 287,
        email_opened_count: 158,
        email_clicked_count: 34,
        opened_rate: 55,
        clicked_rate: 12,
      },
    },
    { id: 'act_wb_wait2', type: 'wait', data: { wait_hours: 504 } },
    {
      id: 'act_wb_offer',
      type: 'send_email',
      data: {
        email_subject: "Here's 20% off if you come back",
        email_lexical: SEEDED_LEXICAL,
        email_design_setting_id: DESIGN,
      },
      stats: {
        email_sent_count: 221,
        email_opened_count: 109,
        email_clicked_count: 41,
        opened_rate: 49,
        clicked_rate: 19,
      },
    },
  ],
  edges: [
    { source_action_id: 'act_wb_wait', target_action_id: 'act_wb_email' },
    { source_action_id: 'act_wb_email', target_action_id: 'act_wb_wait2' },
    { source_action_id: 'act_wb_wait2', target_action_id: 'act_wb_offer' },
  ],
};

// Engaged-reader upsell — the FUTURE lane's segment fixture.
//
// The canonical reason anyone wants segment triggers: not "who signed up" but
// "who is behaving like someone about to pay". The segment ("Engaged free
// members") is a saved filter another team will build; this automation is what
// a publisher points at it.
//
// It waits a day before saying anything. Entering a segment is a threshold
// crossing rather than an act — see the segment_entered stem — so there's no
// moment the member would connect an instant email to, and arriving the second
// they cross reads as surveillance rather than service.
//
// Stats sit between the lead magnet's and the winback's: better than cold
// outreach because these people already read the thing, worse than a welcome
// because nobody asked for this one.
export const engagedUpsell: AutomationDetail = {
  id: 'auto_segment_upsell',
  name: 'Engaged reader upsell',
  slug: 'segment-engaged-upsell',
  status: 'active',
  created_at: '2026-07-02T09:15:00Z',
  updated_at: '2026-07-17T15:40:00Z',
  actions: [
    { id: 'act_seg_wait', type: 'wait', data: { wait_hours: 24 } },
    {
      id: 'act_seg_email',
      type: 'send_email',
      data: {
        email_subject: 'You read a lot of these',
        email_lexical: SEEDED_LEXICAL,
        email_design_setting_id: DESIGN,
      },
      stats: {
        email_sent_count: 508,
        email_opened_count: 356,
        email_clicked_count: 112,
        opened_rate: 70,
        clicked_rate: 22,
      },
    },
  ],
  edges: [{ source_action_id: 'act_seg_wait', target_action_id: 'act_seg_email' }],
};

// The whole fixture set: production's two real automations, plus one per future
// trigger that needs something to demonstrate it.
//
// There were two more — an "Inactive win-back" and a "Cancellation survey" — invented
// to give the analytics something varied to chew on. They went because a prototype
// that shows automations nobody can make is answering questions about a product we
// haven't designed, and every screen had to be read twice to work out which rows were
// real.
//
// The lead magnet is the exception that proves that rule rather than a return to
// it: it's an automation nobody can make YET, it demonstrates a trigger that has
// been scheduled rather than imagined, and no lane that can't make one can see
// it. The old inventions failed all three tests.
export const mockAutomations: AutomationDetail[] = [
  welcomeSeries,
  paidUpgradeNudge,
  leadMagnetDelivery,
  winbackLapsed,
  engagedUpsell,
];

export function getAutomation(id: string): AutomationDetail | undefined {
  return mockAutomations.find((a) => a.id === id);
}
