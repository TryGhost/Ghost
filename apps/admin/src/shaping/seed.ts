import type {
  AutomationAction,
  AutomationDetail,
  AutomationEdge,
  AutomationTrigger,
} from '@tryghost/admin-x-framework/api/automations';
import { API_ROOT, fetchReal } from './real-fetch';
import { type MockDb, type MockRun, newId, setDb } from './db';

// The demo data set: two live welcome flows with a few months of runs, and a
// draft that targets one of the site's real paid tiers. Runs are generated from
// a fixed seed, so every reset gives the same numbers.

const DAY = 86_400_000;
const DEFAULT_EMAIL_DESIGN_SETTING = 'default-automated-email';

// A small fixed-seed random number generator (mulberry32).
const random = (() => {
  let state = 1498;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

const lexical = (paragraphs: string[]) =>
  JSON.stringify({
    root: {
      children: paragraphs.map((text) => ({
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text,
            type: 'extended-text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  });

type StepSpec = { email: { subject: string; body: string[] } } | { waitHours: number };

const buildFlow = (steps: StepSpec[]): { actions: AutomationAction[]; edges: AutomationEdge[] } => {
  const actions: AutomationAction[] = steps.map((step) =>
    'email' in step
      ? {
          id: newId(),
          type: 'send_email',
          data: {
            email_subject: step.email.subject,
            email_lexical: lexical(step.email.body),
            email_design_setting_id: DEFAULT_EMAIL_DESIGN_SETTING,
          },
        }
      : { id: newId(), type: 'wait', data: { wait_hours: step.waitHours } },
  );
  const edges = actions.slice(1).map((action, index) => ({
    source_action_id: actions[index].id,
    target_action_id: action.id,
  }));
  return { actions, edges };
};

const FIRST_NAMES = [
  'Ava',
  'Ben',
  'Chloe',
  'Dev',
  'Elena',
  'Femi',
  'Grace',
  'Hiro',
  'Isla',
  'Jonah',
  'Kemi',
  'Liam',
  'Maya',
  'Noor',
  'Omar',
  'Priya',
  'Quinn',
  'Rosa',
  'Sam',
  'Tara',
];
const LAST_NAMES = [
  'Adams',
  'Baker',
  'Chen',
  'Diaz',
  'Evans',
  'Fischer',
  'Garcia',
  'Hughes',
  'Ito',
  'Jones',
  'Khan',
  'Lopez',
  'Moreau',
  'Nguyen',
  'Okafor',
  'Patel',
];
const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];

const buildRuns = (automationId: string, count: number, days: number, now: number): MockRun[] =>
  Array.from({ length: count }, () => {
    const createdAt = now - random() * days * DAY;
    const ageDays = (now - createdAt) / DAY;
    const roll = random();
    // A run still waiting is a recent one; older runs have finished or left.
    const status: MockRun['status'] =
      ageDays < 5 && roll < 0.7 ? 'in_progress' : roll < 0.12 ? 'exited_early' : 'completed';
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const anonymous = random() < 0.15;
    return {
      id: newId(),
      automation_id: automationId,
      created_at: new Date(createdAt).toISOString(),
      status,
      failed: status !== 'in_progress' && random() < 0.03,
      member: {
        id: newId(),
        name: anonymous ? null : `${first} ${last}`,
        email: `${first}.${last}${Math.floor(random() * 90) + 10}@example.com`.toLowerCase(),
      },
    };
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));

// The site's real paid tiers, so a tier-scoped automation names real ones.
const readPaidTierIds = async (): Promise<string[]> => {
  try {
    const response = await fetchReal(
      `${API_ROOT}/tiers/?filter=${encodeURIComponent('type:paid+active:true')}&limit=all`,
      { credentials: 'include' },
    );
    if (!response.ok) {
      return [];
    }
    const json = (await response.json()) as { tiers?: { id: string }[] };
    return json.tiers?.map((tier) => tier.id) ?? [];
  } catch {
    return [];
  }
};

const LINK_PATHS = [
  'start-here/',
  'archive/',
  'account/',
  'about/',
  'the-best-of-2026/',
  'membership/',
  'tag/guides/',
  'how-we-report/',
  'newsletter-faq/',
  'community/',
  'podcast/',
  'contact/',
];

// Every link in the email, as the API returns them: clicks spread unevenly
// across the clicked ones, most-clicked first, then the never-clicked ones at
// 0, in URL order.
const buildLinks = (count: number, unclicked: number, clicked: number): MockDb['links'][string] => {
  const clickedLinks = count - unclicked;
  const weights = Array.from({ length: clickedLinks }, (_, index) => 1 / (index + 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const url = (index: number) => `https://example.com/${LINK_PATHS[index]}`;
  return [
    ...weights.map((weight, index) => ({
      url: url(index),
      clicked_count: Math.max(1, Math.round((clicked * weight) / total)),
    })),
    ...Array.from({ length: unclicked }, (_, index) => ({
      url: url(clickedLinks + index),
      clicked_count: 0,
    })).sort((a, b) => a.url.localeCompare(b.url)),
  ];
};

export const seedDb = async () => {
  const now = Date.now();
  const paidTierIds = await readPaidTierIds();

  const automation = (
    name: string,
    description: string,
    status: AutomationDetail['status'],
    trigger: AutomationTrigger,
    steps: StepSpec[],
    createdDaysAgo: number,
  ): AutomationDetail => ({
    id: newId(),
    name,
    description,
    status,
    ...trigger,
    ...buildFlow(steps),
    created_at: new Date(now - createdDaysAgo * DAY).toISOString(),
    updated_at: new Date(now - Math.min(createdDaysAgo, 3) * DAY).toISOString(),
  });

  const free = automation(
    'Free member welcome',
    'Greet new free members with a short onboarding sequence.',
    'active',
    { trigger_tier_scope: 'free', trigger_tier_ids: null },
    [
      {
        email: {
          subject: 'Welcome aboard',
          body: ['Thanks for joining us.', 'Here’s what to expect from us each week.'],
        },
      },
      { waitHours: 48 },
      {
        email: {
          subject: 'A few of our favourite posts',
          body: ['To get you started, here are the posts readers love most.'],
        },
      },
      { waitHours: 72 },
      {
        email: {
          subject: 'Thanks for being here',
          body: [
            'Just a quick note to say we’re glad you’re here. Reply any time — we read every one.',
          ],
        },
      },
    ],
    120,
  );
  const paid = automation(
    'Paid member welcome',
    'Welcome members who have just started paying.',
    'active',
    { trigger_tier_scope: 'all_paid', trigger_tier_ids: null },
    [
      {
        email: {
          subject: 'Thank you for supporting us',
          body: ['Your support keeps this publication independent.'],
        },
      },
      { waitHours: 72 },
      {
        email: {
          subject: 'Getting the most from your membership',
          body: ['Here’s everything your membership includes.'],
        },
      },
    ],
    90,
  );
  const tierDraft = automation(
    'Top tier thank-you',
    '',
    'inactive',
    paidTierIds.length > 0
      ? {
          trigger_tier_scope: 'selected_paid',
          trigger_tier_ids: [paidTierIds[paidTierIds.length - 1]],
        }
      : { trigger_tier_scope: 'all_paid', trigger_tier_ids: null },
    [
      {
        email: { subject: 'A personal thank-you', body: ['Thank you for choosing our top tier.'] },
      },
    ],
    6,
  );

  const runs = [...buildRuns(free.id, 160, 120, now), ...buildRuns(paid.id, 70, 90, now)];

  // Email stats and clicked links for the live flows' emails, from their runs.
  // Link counts span the range a card has to handle: many, a couple, none, one.
  // Some links never get clicked; the API still lists them, at 0.
  // Free member welcome holds every state in one flow (many links over two
  // pages, a couple, none); Paid member welcome keeps none and one.
  const linkCounts = [
    { links: 12, unclicked: 4 },
    { links: 2, unclicked: 1 },
    { links: 0, unclicked: 0 },
    { links: 0, unclicked: 0 },
    { links: 1, unclicked: 0 },
  ];
  const links: MockDb['links'] = {};
  for (const flow of [free, paid]) {
    const reached = runs.filter((run) => run.automation_id === flow.id).length;
    let emailIndex = 0;
    flow.actions = flow.actions.map((action) => {
      if (action.type !== 'send_email') {
        return action;
      }
      // Each later email in a flow reaches fewer members.
      const sent = Math.round(reached * 0.82 ** emailIndex);
      emailIndex += 1;
      const opened = Math.round(sent * (0.48 + random() * 0.2));
      const { links: linkCount, unclicked } = linkCounts.shift() ?? { links: 0, unclicked: 0 };
      // An email without clickable links can't be clicked.
      const clicked = linkCount > unclicked ? Math.round(opened * (0.18 + random() * 0.15)) : 0;
      links[action.id] = buildLinks(linkCount, unclicked, clicked);
      return {
        ...action,
        stats: {
          email_sent_count: sent,
          email_opened_count: opened,
          email_clicked_count: clicked,
          // Percentages, as the API sends them (65, not 0.65).
          opened_rate: sent ? Math.round((opened / sent) * 100) : null,
          clicked_rate: sent ? Math.round((clicked / sent) * 100) : null,
        },
      };
    });
  }

  setDb({ automations: [free, paid, tierDraft], runs, links });
};
