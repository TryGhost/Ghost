import { type FakeScenarioId } from './scenario';
import { API_ROOT, fetchReal } from './real-fetch';
import {
  type FakePost,
  type FakeSend,
  LOCATIONS,
  SOURCES,
  isoDay,
  locationsOf,
  membersOn,
  mrrOn,
  offsetsBetween,
  pageviewsOn,
  paidChangesOn,
  postMembers,
  postViews,
  postVisitsOn,
  postsOf,
  sendsOf,
  sourcesOf,
  splitBy,
  subscribersOn,
  totalVisits,
  unit,
  visitsOn,
} from './generate';
import { PROFILES, type Profile } from './profiles';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// The fake analytics backend. `fakeResponse` answers the requests the
// Analytics screens make, in the real API's shapes, with the scenario's
// numbers; anything it doesn't answer (undefined) reaches the real Ghost.
//
// Faked: the stats endpoints, Tinybird (config.stats, its token and every
// pipe, so web traffic shows without Tinybird running), the latest post, and
// the made-up posts the screens link to. Settings are real, with the switches
// analytics depends on forced on (and stripped from saves, so they never
// reach the database).

export const TINYBIRD_HOST = 'tinybird.proto.invalid';
const SITE_UUID = 'proto-site';
const CURRENCY = 'usd';
const DEFAULT_DAYS = 30;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const pagination = (total: number) => ({
  pagination: { page: 1, limit: Math.max(total, 15), pages: 1, total, next: null, prev: null },
});

const timestamp = (offset: number) => `${isoDay(offset)}T09:30:00.000Z`;
const percent = (rate: number) => Math.round(rate * 1000) / 10;

/* Settings the screens check
 * ------------------------------------------------------------------------ */

const FORCED_SETTINGS: Record<string, unknown> = {
  web_analytics_enabled: true,
  paid_members_enabled: true,
  members_track_sources: true,
  email_track_opens: true,
  email_track_clicks: true,
};

type SettingsBody = { settings?: Array<{ key: string; value: unknown }> };

const withForcedSettings = async (response: Response) => {
  if (!response.ok) {
    return response;
  }
  const body = (await response.json()) as SettingsBody;
  const settings = body.settings ?? [];
  const present = new Set(settings.map((setting) => setting.key));
  body.settings = [
    ...settings.map((setting) =>
      setting.key in FORCED_SETTINGS
        ? { ...setting, value: FORCED_SETTINGS[setting.key] }
        : setting,
    ),
    ...Object.entries(FORCED_SETTINGS)
      .filter(([key]) => !present.has(key))
      .map(([key, value]) => ({ key, value })),
  ];
  return json(body, response.status);
};

/* Tinybird filters
 * ------------------------------------------------------------------------ */

const DEVICES: Array<[string, number]> = [
  ['desktop', 0.58],
  ['mobile-ios', 0.24],
  ['mobile-android', 0.15],
  ['unknown', 0.03],
];

const UTM: Record<string, Array<[string, number]>> = {
  utm_source: [
    ['newsletter', 0.05],
    ['bluesky', 0.02],
    ['twitter', 0.01],
  ],
  utm_medium: [
    ['email', 0.05],
    ['social', 0.03],
  ],
  utm_campaign: [
    ['weekly-digest', 0.03],
    ['spring-sale', 0.01],
  ],
  utm_content: [['header-link', 0.01]],
  utm_term: [['ghost', 0.005]],
};

const shareOf = (shares: Array<[string, number]>, value: string) =>
  shares.find(([name]) => name === value)?.[1] ?? 0.01;

// Roughly how much of the traffic the applied filters leave
const filterFactor = (params: URLSearchParams) => {
  let factor = 1;
  const audience = params.get('member_status');
  if (audience && !audience.includes('undefined')) {
    factor *= (audience.includes('free') ? 0.22 : 0) + (audience.includes('paid') ? 0.06 : 0);
  }
  if (params.has('source')) {
    factor *= shareOf(SOURCES, params.get('source') ?? '');
  }
  if (params.has('location')) {
    factor *= shareOf(LOCATIONS, params.get('location') ?? '');
  }
  if (params.has('device')) {
    factor *= shareOf(DEVICES, params.get('device') ?? '');
  }
  for (const field of Object.keys(UTM)) {
    if (params.has(field)) {
      factor *= shareOf(UTM[field], params.get(field) ?? '');
    }
  }
  if (params.has('gift_link')) {
    factor *= params.get('gift_link') === 'true' ? 0.01 : 0.99;
  }
  return factor;
};

/* Building blocks
 * ------------------------------------------------------------------------ */

const DISPLAY_NAMES: Record<string, string> = {
  'google.com': 'Google',
  '': 'Direct',
  'bsky.app': 'Bluesky',
  'x.com': 'Twitter',
  'reddit.com': 'Reddit',
  'news.ycombinator.com': 'Hacker News',
  'facebook.com': 'Facebook',
  'linkedin.com': 'LinkedIn',
  'duckduckgo.com': 'DuckDuckGo',
  'flipboard.com': 'Flipboard',
};

const createWorld = (scenario: FakeScenarioId) => {
  const profile: Profile = PROFILES[scenario];
  const posts = postsOf(profile);
  const sends = sendsOf(profile);
  const sendFor = (post: FakePost): FakeSend | undefined =>
    sends.find((send) => send.post.id === post.id);
  const postById = (id: string) => posts.find((post) => post.id === id);

  // Posts this fake doesn't know (the site's own) still get believable
  // traffic: a mid-ranked post from about six weeks ago
  const postByUuid = (uuid: string): { post: FakePost; index: number } => {
    const index = posts.findIndex((post) => post.uuid === uuid);
    if (index >= 0) {
      return { post: posts[index], index };
    }
    return {
      post: {
        id: uuid,
        uuid,
        slug: uuid,
        title: '',
        author: '',
        publishedOffset: 40,
        featureImage: null,
        sent: false,
      },
      index: 3 + (Math.floor(unit(uuid) * 10) % 10),
    };
  };

  const ranked = (offsets: number[]) =>
    posts
      .map((post, index) => {
        const views = postViews(profile, post, index, offsets);
        return { post, index, views, members: postMembers(profile, views, post) };
      })
      .filter((row) => row.views > 0)
      .sort((a, b) => b.views - a.views);

  const toPost = (post: FakePost) => {
    const index = posts.indexOf(post);
    const views = postViews(
      profile,
      post,
      index,
      offsetsBetween(null, null, post.publishedOffset + 1),
    );
    const members = postMembers(profile, views, post);
    const send = sendFor(post);
    return {
      id: post.id,
      uuid: post.uuid,
      title: post.title,
      slug: post.slug,
      url: `${window.location.origin}/${post.slug}/`,
      excerpt: 'A short excerpt for the prototype.',
      feature_image: post.featureImage,
      published_at: timestamp(post.publishedOffset),
      created_at: timestamp(post.publishedOffset),
      updated_at: timestamp(post.publishedOffset),
      status: 'published',
      visibility: 'public',
      email_only: false,
      authors: [{ id: 'proto-author', name: post.author, slug: 'proto-author' }],
      tags: [],
      tiers: [],
      email: send
        ? {
            id: `proto-email-${post.id}`,
            status: 'submitted',
            submitted_at: timestamp(post.publishedOffset),
            email_count: send.sentTo,
            opened_count: send.opens,
          }
        : null,
      newsletter: send
        ? { id: 'proto-newsletter', name: 'Newsletter', feedback_enabled: true }
        : null,
      count: {
        clicks: send?.clicks ?? 0,
        signups: members.free,
        paid_conversions: members.paid,
        positive_feedback: 0,
        negative_feedback: 0,
      },
    };
  };

  return { profile, posts, sends, sendFor, postById, postByUuid, ranked, toPost };
};

type World = ReturnType<typeof createWorld>;

/* Tinybird pipes
 * ------------------------------------------------------------------------ */

const tinybird = (world: World, pipe: string, params: URLSearchParams) => {
  const { profile } = world;
  const offsets = offsetsBetween(params.get('date_from'), params.get('date_to'), DEFAULT_DAYS);
  const factor = filterFactor(params);
  const postUuid = params.get('post_uuid') || '';
  const target = postUuid ? world.postByUuid(postUuid) : null;
  const visits = (offset: number) =>
    Math.round(
      (target
        ? postVisitsOn(profile, target.post, target.index, offset)
        : visitsOn(profile, offset)) * factor,
    );
  const total = offsets.reduce((sum, offset) => sum + visits(offset), 0);
  const limit = Number(params.get('limit')) || 50;
  const rows = (shares: Array<[string, number]>, column: string) =>
    splitBy(shares, total, `${pipe}:${column}`)
      .slice(0, limit)
      .map((row) => ({ [column]: row.name, visits: row.value }));

  // Version suffixes (api_kpis_v2) answer like the base pipe
  switch (pipe.replace(/_v\d+$/, '')) {
    case 'api_kpis': {
      if (offsets.length === 1) {
        // One day: hourly rows, shaped like a day's traffic
        const day = visits(offsets[0]);
        return Array.from({ length: 24 }, (_, hour) => {
          const shape = 0.4 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 0.35 + 0.25;
          const hourVisits = Math.round((day / 24) * Math.max(0.1, shape));
          return {
            date: `${isoDay(offsets[0])} ${String(hour).padStart(2, '0')}:00:00`,
            visits: hourVisits,
            pageviews: Math.round(hourVisits * profile.pagesPerVisit),
            bounce_rate: 0.52,
            avg_session_sec: 96,
          };
        });
      }
      return offsets.map((offset) => {
        const dayVisits = visits(offset);
        return {
          date: isoDay(offset),
          visits: dayVisits,
          pageviews: target
            ? Math.round(dayVisits * 1.2)
            : Math.round(pageviewsOn(profile, offset) * factor),
          bounce_rate: dayVisits ? 0.45 + unit(`bounce:${offset}`) * 0.15 : 0,
          avg_session_sec: dayVisits ? Math.round(70 + unit(`session:${offset}`) * 60) : 0,
        };
      });
    }
    case 'api_active_visitors':
      return [
        {
          active_visitors: Math.round(profile.activeVisitors * (target ? 0.15 : 1) * factor),
        },
      ];
    case 'api_top_sources':
      return sourcesOf(total)
        .slice(0, limit)
        .map((row) => ({ source: row.name, visits: row.value }));
    case 'api_top_locations':
      return locationsOf(total)
        .slice(0, limit)
        .map((row) => ({ location: row.name, visits: row.value }));
    case 'api_top_devices':
      return rows(DEVICES, 'device');
    case 'api_top_utm_sources':
      return rows(UTM.utm_source, 'utm_source');
    case 'api_top_utm_mediums':
      return rows(UTM.utm_medium, 'utm_medium');
    case 'api_top_utm_campaigns':
      return rows(UTM.utm_campaign, 'utm_campaign');
    case 'api_top_utm_contents':
      return rows(UTM.utm_content, 'utm_content');
    case 'api_top_utm_terms':
      return rows(UTM.utm_term, 'utm_term');
    default:
      return [];
  }
};

/* Ghost stats endpoints
 * ------------------------------------------------------------------------ */

let paidTiers: Promise<string[]> | undefined;

// The site's real paid tiers, so the breakdown by tier shows their names
const loadPaidTiers = () => {
  paidTiers ??= fetchReal(`${API_ROOT}/tiers/?limit=all`)
    .then((response) => response.json())
    .then((body: { tiers?: Array<{ id: string; type: string; active: boolean }> }) =>
      (body.tiers ?? [])
        .filter((tier) => tier.type === 'paid' && tier.active)
        .map((tier) => tier.id),
    )
    .catch(() => []);
  return paidTiers;
};

const subscriptions = async (world: World) => {
  const { profile } = world;
  const tiers = await loadPaidTiers();
  const tierIds = tiers.length ? tiers : ['proto-tier'];
  const rows = new Map<
    string,
    { date: string; tier: string; cadence: string; signups: number; cancellations: number }
  >();
  const add = (offset: number, kind: 'signups' | 'cancellations', count: number) => {
    for (let index = 0; index < count; index++) {
      const key = `${kind}:${offset}:${index}`;
      const cadence = unit(`cadence:${key}`) < profile.annualShare ? 'year' : 'month';
      const tier = tierIds[Math.floor(unit(`tier:${key}`) * tierIds.length) % tierIds.length];
      const id = `${offset}|${tier}|${cadence}`;
      const row = rows.get(id) ?? {
        date: isoDay(offset),
        tier,
        cadence,
        signups: 0,
        cancellations: 0,
      };
      row[kind] += 1;
      rows.set(id, row);
    }
  };
  // About a year and a bit, enough for every range but All time
  for (let offset = 400; offset >= 0; offset--) {
    const changes = paidChangesOn(profile, offset);
    add(offset, 'signups', changes.signups);
    add(offset, 'cancellations', changes.cancellations);
  }
  const stats = [...rows.values()].map((row) => ({
    ...row,
    positive_delta: row.signups,
    negative_delta: row.cancellations,
    count: 0,
  }));
  const paid = membersOn(profile, 0).paid;
  return json({
    stats,
    meta: {
      tiers: tierIds,
      cadences: ['month', 'year'],
      totals: tierIds.flatMap((tier) => [
        {
          tier,
          cadence: 'month',
          count: Math.round((paid * (1 - profile.annualShare)) / tierIds.length),
        },
        { tier, cadence: 'year', count: Math.round((paid * profile.annualShare) / tierIds.length) },
      ]),
    },
  });
};

const newsletterRows = (world: World, params: URLSearchParams) => {
  const hasRange = params.has('date_from') || params.has('date_to');
  const offsets = offsetsBetween(params.get('date_from'), params.get('date_to'), 90);
  const oldest = hasRange ? offsets[0] : 90;
  const newest = hasRange ? offsets[offsets.length - 1] : 0;
  const rows = world.sends
    .filter((send) => send.offset <= oldest && send.offset >= newest)
    .map((send) => ({
      post_id: send.post.id,
      post_title: send.post.title,
      send_date: timestamp(send.offset),
      sent_to: send.sentTo,
      total_opens: send.opens,
      open_rate: send.openRate,
      total_clicks: send.clicks,
      click_rate: send.clickRate,
    }));
  const order = params.get('order') ?? 'open_rate desc';
  const [field, direction] = order.split(' ');
  const sign = direction === 'asc' ? 1 : -1;
  const value = (row: (typeof rows)[number]) =>
    field === 'date' ? row.send_date : field === 'click_rate' ? row.click_rate : row.open_rate;
  return rows.sort((a, b) => (value(a) > value(b) ? sign : value(a) < value(b) ? -sign : 0));
};

const ghostStats = async (world: World, path: string, params: URLSearchParams) => {
  const { profile } = world;
  const offsets = offsetsBetween(params.get('date_from'), params.get('date_to'), DEFAULT_DAYS);

  if (path === 'stats/member_count') {
    const today = membersOn(profile, 0);
    return json({
      stats: offsets.map((offset) => {
        const changes = paidChangesOn(profile, offset);
        return {
          date: isoDay(offset),
          ...membersOn(profile, offset),
          paid_subscribed: changes.signups,
          paid_canceled: changes.cancellations,
        };
      }),
      meta: {
        totals: { paid: today.paid, free: today.free, comped: today.comped, gift: today.gift },
      },
    });
  }

  if (path === 'stats/mrr') {
    return json({
      stats: offsets.map((offset) => ({
        date: isoDay(offset),
        mrr: mrrOn(profile, offset),
        currency: CURRENCY,
      })),
      meta: { totals: [{ mrr: mrrOn(profile, 0), currency: CURRENCY }] },
    });
  }

  if (path === 'stats/subscriptions') {
    return subscriptions(world);
  }

  if (path === 'stats/top-posts-views') {
    const limit = Number(params.get('limit')) || 5;
    return json({
      stats: world
        .ranked(offsets)
        .slice(0, limit)
        .map(({ post, views, members }) => {
          const send = world.sendFor(post);
          return {
            post_id: post.id,
            title: post.title,
            published_at: timestamp(post.publishedOffset),
            feature_image: post.featureImage,
            status: 'published',
            authors: post.author,
            views,
            sent_count: send?.sentTo ?? null,
            opened_count: send?.opens ?? null,
            // 0–100 on this endpoint
            open_rate: send ? percent(send.openRate) : null,
            clicked_count: send?.clicks ?? 0,
            click_rate: send ? percent(send.clickRate) : null,
            members: members.free + members.paid,
            free_members: members.free,
            paid_members: members.paid,
          };
        }),
    });
  }

  if (path === 'stats/top-content') {
    const factor = filterFactor(params);
    const visits = totalVisits(profile, offsets) * factor;
    const type = params.get('post_type');
    const postRows = world.ranked(offsets).map(({ post, views }) => ({
      pathname: `/${post.slug}/`,
      title: post.title,
      post_uuid: post.uuid,
      post_id: post.id,
      post_type: 'post',
      url_exists: true,
      visits: Math.round(views * factor),
    }));
    // Pages get shares that land among the top posts, so Top content shows
    // posts and pages mixed together, as on a typical site
    const page = (
      pathname: string,
      title: string,
      share: number,
    ): { pathname: string; title: string; post_type?: string; visits: number } => ({
      pathname,
      title,
      post_type: 'page',
      visits: Math.round(visits * share),
    });
    const pageRows = [
      { pathname: '/', title: 'Homepage', visits: Math.round(visits * 0.18) },
      page('/about/', 'About', 0.04),
      page('/start/', 'Start here', 0.032),
      page('/newsletter/', 'Newsletter', 0.027),
      page('/membership/', 'Membership', 0.02),
      page('/contact/', 'Contact', 0.01),
    ].map((row) => ({ url_exists: true, ...row }));
    const stats = [
      ...(type === 'page' ? [] : postRows),
      ...(type === 'post' ? [] : pageRows.filter((row) => type !== 'page' || row.post_type)),
    ]
      .filter((row) => row.visits > 0)
      .sort((a, b) => b.visits - a.visits);
    return json({ stats, meta: {} });
  }

  if (path === 'stats/top-posts') {
    const order = (params.get('order') ?? 'free_members desc').split(' ')[0];
    const rows = world.ranked(offsets).map(({ post, members }) => ({
      post_id: post.id,
      attribution_url: `/${post.slug}/`,
      attribution_type: 'post',
      attribution_id: post.id,
      title: post.title,
      free_members: members.free,
      paid_members: members.paid,
      mrr: members.paid * profile.mrrPerPaidCents,
      published_at: timestamp(post.publishedOffset),
      post_type: 'post',
      url_exists: true,
    }));
    const homepageFree = Math.round(profile.freePerDay * offsets.length * 0.25);
    const homepagePaid = Math.round(profile.paidPerDay * offsets.length * 0.2);
    const homepage = {
      post_id: null,
      attribution_url: '/',
      attribution_type: 'url',
      attribution_id: null,
      title: 'Homepage',
      free_members: homepageFree,
      paid_members: homepagePaid,
      mrr: homepagePaid * profile.mrrPerPaidCents,
      published_at: null,
      post_type: null,
      url_exists: true,
    };
    const stats = [...(params.get('post_type') ? [] : [homepage]), ...rows]
      .filter((row) => row.free_members + row.paid_members > 0)
      .sort(
        (a, b) => Number(b[order as 'free_members'] ?? 0) - Number(a[order as 'free_members'] ?? 0),
      );
    return json({ stats, meta: {} });
  }

  if (path === 'stats/top-sources-growth') {
    const signups = Math.round(profile.freePerDay * offsets.length * 1.4);
    const conversions = Math.round(profile.paidSignupsPerDay * offsets.length);
    const order = (params.get('order') ?? 'signups desc').split(' ')[0];
    const limit = Number(params.get('limit')) || 20;
    const stats = sourcesOf(signups)
      .map((row) => {
        const paid = Math.round(
          (row.value / Math.max(1, signups)) * conversions * (0.7 + unit(`conv:${row.name}`) * 0.6),
        );
        return {
          source: DISPLAY_NAMES[row.name] ?? row.name,
          signups: row.value,
          paid_conversions: paid,
          mrr: paid * profile.mrrPerPaidCents,
        };
      })
      .sort((a, b) =>
        order === 'source'
          ? a.source.localeCompare(b.source)
          : Number(b[order as 'signups'] ?? 0) - Number(a[order as 'signups'] ?? 0),
      )
      .slice(0, limit);
    return json({ stats, meta: {} });
  }

  if (path === 'stats/subscriber-count') {
    return json({
      stats: [
        {
          total: subscribersOn(profile, 0),
          values: offsets.map((offset) => ({
            date: isoDay(offset),
            value: subscribersOn(profile, offset),
          })),
        },
      ],
    });
  }

  if (path === 'stats/newsletter-basic-stats' || path === 'stats/newsletter-stats') {
    return json({ stats: newsletterRows(world, params), meta: {} });
  }

  if (path === 'stats/newsletter-click-stats') {
    const ids = (params.get('post_ids') ?? '').split(',').filter(Boolean);
    return json({
      stats: world.sends
        .filter((send) => ids.includes(send.post.id))
        .map((send) => ({
          post_id: send.post.id,
          total_clicks: send.clicks,
          click_rate: send.clickRate,
          email_count: send.sentTo,
        })),
      meta: {},
    });
  }

  // One made-up post's own numbers (the site's real posts reach Ghost)
  const postMatch = path.match(/^stats\/posts\/(proto-post-\d+)\/(stats|top-referrers|growth)$/);
  const post = postMatch ? world.postById(postMatch[1]) : undefined;
  if (postMatch && post) {
    const index = world.posts.indexOf(post);
    const views = postViews(
      profile,
      post,
      index,
      offsetsBetween(null, null, post.publishedOffset + 1),
    );
    const members = postMembers(profile, views, post);
    const send = world.sendFor(post);
    if (postMatch[2] === 'stats') {
      return json({
        stats: [
          {
            id: post.id,
            recipient_count: send?.sentTo ?? null,
            opened_count: send?.opens ?? null,
            open_rate: send ? percent(send.openRate) : null,
            member_delta: members.free + members.paid,
            free_members: members.free,
            paid_members: members.paid,
            visitors: views,
          },
        ],
      });
    }
    if (postMatch[2] === 'growth') {
      return json({
        stats: [
          {
            post_id: post.id,
            free_members: members.free,
            paid_members: members.paid,
            mrr: members.paid * profile.mrrPerPaidCents,
          },
        ],
        meta: {},
      });
    }
    const freeBySource = sourcesOf(members.free);
    return json({
      stats: freeBySource.map((row) => {
        const paid = Math.round((row.value / Math.max(1, members.free)) * members.paid);
        return {
          source: row.name || 'Direct',
          referrer_url: row.name ? `https://${row.name}` : undefined,
          free_members: row.value,
          paid_members: paid,
          mrr: paid * profile.mrrPerPaidCents,
        };
      }),
      meta: {},
    });
  }

  return undefined;
};

/* Posts the screens read
 * ------------------------------------------------------------------------ */

const posts = (world: World, params: URLSearchParams) => {
  const filter = params.get('filter') ?? '';
  // Overview's latest post
  if (
    filter === 'status:[published,sent]' &&
    params.get('limit') === '1' &&
    (params.get('include') ?? '').includes('email')
  ) {
    const latest = world.posts[0];
    return json({ posts: latest ? [world.toPost(latest)] : [], meta: pagination(latest ? 1 : 0) });
  }
  // A made-up post opened from a list (post analytics)
  const idMatch = filter.match(/^id:'?(proto-post-\d+)'?$/);
  const post = idMatch ? world.postById(idMatch[1]) : undefined;
  if (post) {
    return json({ posts: [world.toPost(post)], meta: pagination(1) });
  }
  return undefined;
};

/* Router
 * ------------------------------------------------------------------------ */

export const fakeResponseFor = (scenario: FakeScenarioId) => {
  const world = createWorld(scenario);

  return async (request: Request): Promise<Response | undefined> => {
    const url = new URL(request.url);
    const params = url.searchParams;

    if (url.hostname === TINYBIRD_HOST) {
      const pipe = url.pathname.match(/\/v0\/pipes\/([^/.]+)\.json$/)?.[1] ?? '';
      return json({ meta: [], data: tinybird(world, pipe, params) });
    }

    const apiIndex = url.pathname.indexOf(`${API_ROOT}/`);
    if (apiIndex < 0) {
      return undefined;
    }
    // Trailing slashes vary by caller; compare without them
    const path = url.pathname.slice(apiIndex + API_ROOT.length + 1).replace(/\/+$/, '');

    if (path === 'settings') {
      if (request.method === 'PUT') {
        // Never save the forced switches to the database
        const body = (await request.clone().json()) as SettingsBody;
        body.settings = (body.settings ?? []).filter(
          (setting) => !(setting.key in FORCED_SETTINGS),
        );
        return withForcedSettings(
          await fetchReal(new Request(request, { body: JSON.stringify(body) })),
        );
      }
      if (request.method === 'GET') {
        return withForcedSettings(await fetchReal(request));
      }
      return undefined;
    }

    if (request.method !== 'GET') {
      return undefined;
    }

    if (path === 'config') {
      const response = await fetchReal(request);
      if (!response.ok) {
        return response;
      }
      const body = (await response.json()) as { config?: Record<string, unknown> };
      body.config = {
        ...body.config,
        stats: { id: SITE_UUID, endpoint: `https://${TINYBIRD_HOST}` },
      };
      return json(body);
    }

    if (path === 'tinybird/token') {
      return json({ tinybird: { token: 'proto-token', exp: timestamp(-365) } });
    }

    if (path.startsWith('stats/')) {
      return ghostStats(world, path, params);
    }

    if (path === 'posts') {
      return posts(world, params);
    }

    const linksMatch = path === 'links' && (params.get('filter') ?? '').match(/proto-post-\d+/);
    const linkPost = linksMatch ? world.postById(linksMatch[0]) : undefined;
    if (linkPost) {
      const send = world.sendFor(linkPost);
      const clicks = send?.clicks ?? 0;
      const targets: Array<[string, number]> = [
        [`/${linkPost.slug}/#comments`, 0.34],
        ['/membership/', 0.22],
        ['https://example.com/report.pdf', 0.18],
        ['/archive/', 0.12],
      ];
      return json({
        links: targets.map(([to, share], index) => ({
          post_id: linkPost.id,
          link: { link_id: `proto-link-${index}`, from: to, to, edited: false },
          count: { clicks: Math.round(clicks * share) },
        })),
        meta: pagination(targets.length),
      });
    }

    if (/^feedback\/proto-post-\d+$/.test(path)) {
      return json({ feedback: [], meta: pagination(0) });
    }

    return undefined;
  };
};
