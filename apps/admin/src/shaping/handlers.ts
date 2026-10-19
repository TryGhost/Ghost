import { HttpResponse, http } from 'msw';
import type {
  AutomationBrowseItem,
  AutomationDetail,
  AutomationPerformanceStats,
  AutomationRun,
} from '@tryghost/admin-x-framework/api/automations';
import type { AutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';
import { API_ROOT, fetchReal } from './real-fetch';
import { type MockRun, getDb, newId, saveDb } from './db';
import { readFakeStripe, readFakeTracking } from './mode';

// The fake backend. Each handler answers one real endpoint in the shape the
// real API uses (see admin-x-framework/src/api/automations.ts), so the real
// screens can't tell the difference. Anything not listed here reaches Ghost.

const api = (path: string) => `*${API_ROOT}${path}`;
const DAY = 86_400_000;

const notFound = () =>
  HttpResponse.json(
    { errors: [{ message: 'Automation not found.', type: 'NotFoundError' }] },
    { status: 404 },
  );

const findAutomation = (id: string) => getDb().automations.find((item) => item.id === id);
const runsOf = (id: string) => getDb().runs.filter((run) => run.automation_id === id);

const toBrowseItem = (automation: AutomationDetail): AutomationBrowseItem => {
  const runs = runsOf(automation.id);
  return {
    id: automation.id,
    name: automation.name,
    description: automation.description,
    status: automation.status,
    stats: {
      last_run_created_at: runs[0]?.created_at ?? null,
      total_run_count: runs.length,
      in_progress_run_count: runs.filter((run) => run.status === 'in_progress').length,
    },
  };
};

// The save rules the real server enforces that the screens react to.
const nameTaken = (name: string, exceptId?: string) =>
  getDb().automations.some(
    (item) => item.id !== exceptId && item.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
const nameTakenError = () =>
  HttpResponse.json(
    {
      errors: [
        { message: 'An automation with this name already exists.', type: 'ValidationError' },
      ],
    },
    { status: 422 },
  );

type SaveBody = { automations: [Partial<AutomationDetail>] };

// Drop the fields a request left out, so a status-only save keeps the rest.
const definedFields = (fields: Partial<AutomationDetail>) =>
  Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as Partial<AutomationDetail>;

// Email stats are the server's to compute; a saved action keeps the ones it had.
const keepStats = (previous: AutomationDetail | undefined, next: AutomationDetail) => ({
  ...next,
  actions: next.actions.map((action) => {
    const before = previous?.actions.find((item) => item.id === action.id);
    return before && 'stats' in before && before.stats && action.type === 'send_email'
      ? { ...action, stats: before.stats }
      : action;
  }),
});

const dateOnly = (iso: string) => iso.slice(0, 10);
const addDays = (date: string, days: number) =>
  new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);

// The window a stats or runs request covers: the requested dates, or (for "all
// time") from the automation's creation to today. date_to is exclusive.
const windowFor = (automation: AutomationDetail, params: URLSearchParams) => {
  const today = dateOnly(new Date().toISOString());
  const from = params.get('date_from') ?? dateOnly(automation.created_at);
  const to = params.get('date_to') ? addDays(params.get('date_to')!, 1) : addDays(today, 1);
  return { from, to };
};

const inWindow = (run: MockRun, window: { from: string; to: string }) => {
  const day = dateOnly(run.created_at);
  return day >= window.from && day < window.to;
};

const historyFor = (automation: AutomationDetail, run: MockRun): AutomationRunHistory => {
  // Walk the flow in order, from the action nothing points at.
  const targets = new Set(automation.edges.map((edge) => edge.target_action_id));
  const ordered: AutomationDetail['actions'] = [];
  let current = automation.actions.find((action) => !targets.has(action.id));
  while (current) {
    ordered.push(current);
    const next = automation.edges.find((edge) => edge.source_action_id === current!.id);
    current = next && automation.actions.find((action) => action.id === next.target_action_id);
  }

  // How far the run got: all the way, part way, or into the middle step.
  const reached =
    run.status === 'completed'
      ? ordered.length
      : run.status === 'exited_early'
        ? Math.max(1, Math.floor(ordered.length / 2))
        : Math.min(ordered.length, 2);

  let clock = Date.parse(run.created_at);
  const steps = ordered.slice(0, reached).map((action, index) => {
    const last = index === reached - 1;
    const pending = run.status === 'in_progress' && last;
    const left = run.status === 'exited_early' && last;
    const readyAt = new Date(clock).toISOString();
    if (action.type === 'wait') {
      clock += action.data.wait_hours * 3_600_000;
    } else {
      clock += 60_000;
    }
    const finishedAt = pending ? null : new Date(clock).toISOString();
    const isEmail = action.type === 'send_email';
    return {
      id: `${run.id}-${index}`,
      automation_action_revision_id: `${action.id}-rev`,
      created_at: readyAt,
      updated_at: finishedAt ?? readyAt,
      ready_at: readyAt,
      started_at: pending && !isEmail ? readyAt : finishedAt ? readyAt : null,
      finished_at: finishedAt,
      email_sent_at: isEmail && finishedAt ? finishedAt : null,
      email_delivered_at: isEmail && finishedAt ? finishedAt : null,
      status: pending
        ? ('pending' as const)
        : left
          ? ('member unsubscribed' as const)
          : run.failed && last
            ? ('failed' as const)
            : ('finished' as const),
      action:
        action.type === 'wait'
          ? { id: action.id, type: 'wait' as const, data: { wait_hours: action.data.wait_hours } }
          : {
              id: action.id,
              type: 'send_email' as const,
              data: {
                email_subject: action.data.email_subject,
                email_lexical: action.data.email_lexical,
              },
            },
    };
  });

  return { ...run, automation_id: automation.id, steps };
};

// A faked Stripe Connect connection: the keys Admin looks for
// (checkStripeEnabled) with made-up values. Only while the prototype menu's
// "Stripe connected" is on.
const FAKE_STRIPE: Record<string, string | boolean> = {
  stripe_connect_publishable_key: 'pk_test_shaping_prototype',
  stripe_connect_secret_key: 'sk_test_shaping_prototype',
  stripe_connect_account_id: 'acct_shaping_prototype',
  stripe_connect_display_name: 'Shaping prototype',
  stripe_connect_livemode: false,
};

type SettingsBody = { settings: { key: string; value: unknown }[] };

// Everything the prototype menu fakes in the site settings: email tracking
// always (its switches default to on), Stripe when switched on.
const fakeSettings = (): Record<string, string | boolean> => ({
  email_track_opens: readFakeTracking('opens'),
  email_track_clicks: readFakeTracking('clicks'),
  ...(readFakeStripe() ? FAKE_STRIPE : {}),
});

const withFakeSettings = (body: SettingsBody): SettingsBody => {
  const fakes = fakeSettings();
  const settings = body.settings.map((setting) =>
    setting.key in fakes ? { ...setting, value: fakes[setting.key] } : setting,
  );
  for (const [key, value] of Object.entries(fakes)) {
    if (!settings.some((setting) => setting.key === key)) {
      settings.push({ key, value });
    }
  }
  return { ...body, settings };
};

export const handlers = [
  // Performance needs Tinybird's config to show; give it one so the tab
  // renders, with the stats themselves answered below.
  http.get(api('/config/'), async ({ request }) => {
    const response = await fetchReal(request.url, { credentials: 'include' });
    const json = (await response.json()) as { config: Record<string, unknown> };
    json.config.stats ??= { id: 'shaping-mock', endpoint: '' };
    return HttpResponse.json(json, { status: response.status });
  }),

  // Settings pass through to Ghost, and the answer carries the faked values.
  http.get(api('/settings/'), async ({ request }) => {
    const response = await fetchReal(request.url, { credentials: 'include' });
    const json = (await response.json()) as SettingsBody;
    return HttpResponse.json(response.ok ? withFakeSettings(json) : json, {
      status: response.status,
    });
  }),

  // A save from Settings would send the faked values back; strip them so
  // they're never written to the real database, and keep the answer faked.
  http.put(api('/settings/'), async ({ request }) => {
    const fakes = fakeSettings();
    const body = (await request.json()) as SettingsBody;
    const response = await fetchReal(request.url, {
      method: 'PUT',
      credentials: 'include',
      headers: request.headers,
      body: JSON.stringify({
        ...body,
        settings: body.settings.filter((setting) => !(setting.key in fakes)),
      }),
    });
    const json = (await response.json()) as SettingsBody;
    return HttpResponse.json(response.ok ? withFakeSettings(json) : json, {
      status: response.status,
    });
  }),

  http.get(api('/automations/'), () =>
    HttpResponse.json({
      automations: getDb().automations.map(toBrowseItem),
      meta: {
        pagination: {
          page: 1,
          limit: 'all',
          pages: 1,
          total: getDb().automations.length,
          next: null,
          prev: null,
        },
      },
    }),
  ),

  http.post(api('/automations/'), async ({ request }) => {
    const { automations } = (await request.json()) as SaveBody;
    const fields = definedFields(automations[0]);
    if (fields.name && nameTaken(fields.name)) {
      return nameTakenError();
    }
    const now = new Date().toISOString();
    const created = {
      id: newId(),
      name: '',
      description: '',
      status: 'inactive',
      trigger_tier_scope: null,
      trigger_tier_ids: null,
      actions: [],
      edges: [],
      ...fields,
      created_at: now,
      updated_at: now,
    } as AutomationDetail;
    getDb().automations.push(created);
    saveDb();
    return HttpResponse.json({ automations: [created] }, { status: 201 });
  }),

  http.get(api('/automations/:id/'), ({ params }) => {
    const automation = findAutomation(String(params.id));
    return automation ? HttpResponse.json({ automations: [automation] }) : notFound();
  }),

  http.put(api('/automations/:id/'), async ({ params, request }) => {
    const id = String(params.id);
    const existing = findAutomation(id);
    if (!existing) {
      return notFound();
    }
    const { automations } = (await request.json()) as SaveBody;
    const fields = definedFields(automations[0]);
    if (fields.name && nameTaken(fields.name, id)) {
      return nameTakenError();
    }
    // A cast: the trigger's scope and tier ids arrive together, but TypeScript
    // can't see that through a partial merge.
    const updated = keepStats(existing, {
      ...existing,
      ...fields,
      id,
      updated_at: new Date().toISOString(),
    } as AutomationDetail);
    const db = getDb();
    db.automations = db.automations.map((item) => (item.id === id ? updated : item));
    saveDb();
    return HttpResponse.json({ automations: [updated] });
  }),

  http.get(api('/automations/:id/performance-stats/'), ({ params, request }) => {
    const automation = findAutomation(String(params.id));
    if (!automation) {
      return notFound();
    }
    const query = new URL(request.url).searchParams;
    const window = windowFor(automation, query);
    const runs = runsOf(automation.id).filter((run) => inWindow(run, window));
    // One day asks for hourly buckets; anything longer is daily.
    const hourly = addDays(window.from, 1) === window.to;
    const entries: AutomationPerformanceStats['entries'] = [];
    if (hourly) {
      for (let hour = 0; hour < 24; hour += 1) {
        const start = Date.parse(`${window.from}T00:00:00.000Z`) + hour * 3_600_000;
        entries.push({
          date: new Date(start).toISOString(),
          count: runs.filter((run) => {
            const at = Date.parse(run.created_at);
            return at >= start && at < start + 3_600_000;
          }).length,
        });
      }
    } else {
      for (let day = window.from; day < window.to; day = addDays(day, 1)) {
        entries.push({
          date: day,
          count: runs.filter((run) => dateOnly(run.created_at) === day).length,
        });
      }
    }
    const stats: AutomationPerformanceStats = {
      automation_id: automation.id,
      total_run_count: runs.length,
      in_progress_run_count: runs.filter((run) => run.status === 'in_progress').length,
      completed_run_count: runs.filter((run) => run.status === 'completed').length,
      exited_early_run_count: runs.filter((run) => run.status === 'exited_early').length,
      entries: entries.length > 0 ? entries : [{ date: window.from, count: 0 }],
      entry_window: {
        date_from: window.from,
        date_to: window.to,
        bucket: hourly ? 'hour' : 'day',
        timezone: query.get('timezone') ?? 'Etc/UTC',
      },
    };
    return HttpResponse.json({ automation_performance_stats: [stats] });
  }),

  http.get(api('/automations/:id/runs/'), ({ params, request }) => {
    const automation = findAutomation(String(params.id));
    if (!automation) {
      return notFound();
    }
    const query = new URL(request.url).searchParams;
    const search = query.get('search')?.trim().toLowerCase();
    const status = query.get('status');
    let runs = runsOf(automation.id);
    if (search) {
      runs = runs.filter(
        (run) =>
          run.member?.email.toLowerCase().includes(search) ||
          run.member?.name?.toLowerCase().includes(search),
      );
    } else {
      const window = windowFor(automation, query);
      runs = runs.filter((run) => inWindow(run, window) && (!status || run.status === status));
    }
    if (query.get('order') === 'created_at asc') {
      runs = [...runs].reverse();
    }
    const limit = Math.min(Number(query.get('limit')) || 50, 50);
    const offset = Number(query.get('cursor')) || 0;
    const page = runs.slice(offset, offset + limit);
    const nextCursor = offset + limit < runs.length ? String(offset + limit) : null;
    return HttpResponse.json({
      automation_runs: page.map(({ automation_id: _automationId, ...run }): AutomationRun => run),
      meta: {
        pagination: { state: nextCursor ? 'more' : 'exhausted', limit, next_cursor: nextCursor },
      },
    });
  }),

  http.get(api('/automations/:id/runs/:runId/'), ({ params }) => {
    const automation = findAutomation(String(params.id));
    const run = getDb().runs.find((item) => item.id === String(params.runId));
    if (!automation || !run) {
      return notFound();
    }
    return HttpResponse.json({ automation_run_history: [historyFor(automation, run)] });
  }),

  http.get(api('/automations/:id/actions/:actionId/links/'), ({ params }) =>
    HttpResponse.json({ automation_action_links: getDb().links[String(params.actionId)] ?? [] }),
  ),

  // Rendering an email needs the server's email pipeline; a plain stand-in
  // shows the subject and says the body is mocked.
  http.post(api('/automations/:id/email_preview'), async ({ request }) => {
    const { subject } = (await request.json()) as { subject: string };
    const html = `<!doctype html><html><body style="font-family: system-ui, sans-serif; padding: 32px;"><h1 style="font-size: 22px;">${subject.replace(/</g, '&lt;')}</h1><p style="color: #777;">Email preview is mocked in the shaping prototype.</p></body></html>`;
    return HttpResponse.json({
      automation_email_previews: [{ html, plaintext: subject, subject }],
    });
  }),

  http.post(api('/automations/:id/email_test'), () => HttpResponse.json({})),
];
