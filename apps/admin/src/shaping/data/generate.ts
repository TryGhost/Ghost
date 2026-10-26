import { type Profile } from './profiles';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// Turns a scenario's profile into the numbers the screens show: daily series
// for any date range, plus posts, newsletter sends, sources and locations.
// Deterministic (seeded by the date and what's being counted), so a day's
// numbers are the same on every screen and every reload.
//
// Days are counted back from today: offset 0 is today, 1 is yesterday.

/* Dates
 * ------------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

const noon = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  return copy;
};

export const isoDay = (offset: number) => {
  const date = noon(new Date());
  date.setDate(date.getDate() - offset);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const offsetOf = (iso: string) => {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return Math.round((noon(new Date()).getTime() - date.getTime()) / DAY_MS);
};

// Offsets for a date range, oldest first. Missing ends default to the last
// 30 days; the range never reaches past today.
export const offsetsBetween = (from?: string | null, to?: string | null, fallbackDays = 30) => {
  const newest = Math.max(0, to ? offsetOf(to) : 0);
  const oldest = Math.max(newest, from ? offsetOf(from) : newest + fallbackDays - 1);
  return Array.from({ length: oldest - newest + 1 }, (_, index) => oldest - index);
};

/* Seeded noise
 * ------------------------------------------------------------------------ */

const hash = (key: string) => {
  let value = 2166136261;
  for (let index = 0; index < key.length; index++) {
    value ^= key.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

// 0 to 1
export const unit = (key: string) => {
  let value = hash(key) + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

// -1 to 1
const wobble = (key: string) => unit(key) * 2 - 1;

// A whole-number count whose average is `rate`, e.g. 0.12 signups a day.
const countAround = (rate: number, key: string) =>
  rate <= 0 ? 0 : Math.max(0, Math.floor(rate * (1 + wobble(`${key}:a`) * 0.5) + unit(`${key}:b`)));

/* Daily series
 * ------------------------------------------------------------------------ */

const weekdayFactor = (offset: number) => {
  const weekday = new Date(`${isoDay(offset)}T12:00:00`).getDay();
  return weekday === 0 || weekday === 6 ? 0.74 : 1;
};

export const visitsOn = (profile: Profile, offset: number) => {
  if (profile.visitorsPerDay <= 0) {
    return 0;
  }
  const wave = 1 + Math.sin(offset / 9) * 0.1;
  const jitter = 1 + wobble(`visits:${offset}`) * profile.noise;
  // Now and then a post takes off, more noticeably on small sites
  const spike = unit(`spike:${offset}`) > 0.94 ? 1.6 + unit(`spike-size:${offset}`) * 2.4 : 1;
  return Math.max(
    0,
    Math.round(profile.visitorsPerDay * weekdayFactor(offset) * wave * jitter * spike),
  );
};

export const pageviewsOn = (profile: Profile, offset: number) =>
  Math.round(
    visitsOn(profile, offset) * profile.pagesPerVisit * (1 + wobble(`views:${offset}`) * 0.08),
  );

// Members on a day: cumulative, easing back from today's totals
export const membersOn = (profile: Profile, offset: number) => {
  const drift = 1 + Math.sin(offset / 11) * 0.15;
  return {
    free: Math.max(0, Math.round(profile.free - profile.freePerDay * offset * drift)),
    paid: Math.max(0, Math.round(profile.paid - profile.paidPerDay * offset * drift)),
    comped: profile.comped,
    gift: profile.gift,
  };
};

export const mrrOn = (profile: Profile, offset: number) =>
  membersOn(profile, offset).paid * profile.mrrPerPaidCents;

export const paidChangesOn = (profile: Profile, offset: number) => ({
  signups: countAround(profile.paidSignupsPerDay, `signups:${offset}`),
  cancellations: countAround(profile.paidCancelsPerDay, `cancels:${offset}`),
});

export const subscribersOn = (profile: Profile, offset: number) =>
  Math.max(0, Math.round(profile.subscribers - profile.subscribersPerDay * offset));

export const totalVisits = (profile: Profile, offsets: number[]) =>
  offsets.reduce((sum, offset) => sum + visitsOn(profile, offset), 0);

/* Posts
 * ------------------------------------------------------------------------ */

const TITLES = [
  'Sheet music for the algorithm era',
  'On working slowly in a world that rewards speed',
  'Half-finished thoughts on subscription pricing',
  'A field guide to independent publishing',
  'The case for writing less often',
  'What we learned from a year of paid subscriptions',
  'Notes from the road: Lisbon',
  'Ask me anything, March edition',
  'The slow web, revisited',
  'Why the comments section is worth saving',
  'Inside the numbers: our first thousand readers',
  'A quiet defence of long reads',
  'Everything I got wrong about SEO',
  'The newsletter that almost wasn’t',
  'Five tools I use every single day',
  'How a small team ships every week',
  'The best things we read this month',
  'Letters from readers, answered',
  'A beginner’s guide to the archive',
  'Why we stopped chasing virality',
];

const AUTHORS = ['Aron Lemke', 'Maren Calzoni', 'Jamie Ortiz'];

const IMAGES = [
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
  null,
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800',
];

export interface FakePost {
  id: string;
  uuid: string;
  slug: string;
  title: string;
  author: string;
  publishedOffset: number;
  featureImage: string | null;
  // Sent as a newsletter as well as published
  sent: boolean;
}

// The most recent posts, newest first. Posting cadence follows the
// newsletter: a daily publisher posts daily, a small one weekly.
export const postsOf = (profile: Profile): FakePost[] => {
  const count = Math.min(profile.posts, TITLES.length);
  const spacing = Math.max(1, profile.sendEveryDays || 7);
  return Array.from({ length: count }, (_, index) => {
    const slug = TITLES[index]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return {
      id: `proto-post-${index}`,
      uuid: `proto-post-uuid-${index}`,
      slug,
      title: TITLES[index],
      author: AUTHORS[index % AUTHORS.length],
      publishedOffset: 1 + index * spacing,
      featureImage: IMAGES[index % IMAGES.length],
      sent: index % 5 !== 3,
    };
  });
};

// A post's share of the site's traffic: recent posts and the first few
// ranks take most of it.
const postShare = (index: number) => 0.2 * Math.pow(0.68, index) + 0.004;

export const postViews = (profile: Profile, post: FakePost, index: number, offsets: number[]) => {
  const live = offsets.filter((offset) => offset <= post.publishedOffset);
  const visits = totalVisits(profile, live);
  return Math.round(visits * postShare(index) * (1 + wobble(`post-views:${post.id}`) * 0.2));
};

export const postMembers = (profile: Profile, views: number, post: FakePost) => {
  const freeRate = profile.free > 0 ? 1 / 55 : 0;
  const paidRate = profile.paid > 0 ? 1 / 900 : 0;
  return {
    free: Math.round(views * freeRate * (1 + wobble(`post-free:${post.id}`) * 0.3)),
    paid: Math.round(views * paidRate * (1 + wobble(`post-paid:${post.id}`) * 0.5)),
  };
};

/* Newsletter sends
 * ------------------------------------------------------------------------ */

export interface FakeSend {
  post: FakePost;
  offset: number;
  sentTo: number;
  opens: number;
  openRate: number;
  clicks: number;
  clickRate: number;
}

export const sendsOf = (profile: Profile): FakeSend[] =>
  postsOf(profile)
    .filter((post) => post.sent)
    .map((post) => {
      const sentTo = subscribersOn(profile, post.publishedOffset);
      const openRate = Math.min(0.95, profile.openRate * (1 + wobble(`open:${post.id}`) * 0.12));
      const clickRate = Math.min(
        openRate,
        profile.clickRate * (1 + wobble(`click:${post.id}`) * 0.3),
      );
      return {
        post,
        offset: post.publishedOffset,
        sentTo,
        opens: Math.round(sentTo * openRate),
        openRate,
        clicks: Math.round(sentTo * clickRate),
        clickRate,
      };
    });

/* Breakdowns
 * ------------------------------------------------------------------------ */

export const SOURCES: Array<[string, number]> = [
  ['google.com', 0.3],
  ['', 0.22], // Direct
  ['bsky.app', 0.09],
  ['x.com', 0.06],
  ['reddit.com', 0.06],
  ['news.ycombinator.com', 0.04],
  ['facebook.com', 0.04],
  ['linkedin.com', 0.03],
  ['duckduckgo.com', 0.03],
  ['flipboard.com', 0.02],
];

export const LOCATIONS: Array<[string, number]> = [
  ['US', 0.38],
  ['GB', 0.13],
  ['DE', 0.07],
  ['CA', 0.07],
  ['AU', 0.05],
  ['NL', 0.03],
  ['FR', 0.03],
  ['IN', 0.03],
  ['IT', 0.02],
  ['SE', 0.02],
  ['BR', 0.02],
  ['ES', 0.02],
];

// Split a total across shares, dropping anything that rounds to nothing.
// Small sites get fewer rows, as they would.
const split = (shares: Array<[string, number]>, total: number, key: string) =>
  shares
    .map(([name, share]) => ({
      name,
      value: Math.round(total * share * (1 + wobble(`${key}:${name}`) * 0.25)),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

export const sourcesOf = (total: number) => split(SOURCES, total, 'source');
export const locationsOf = (total: number) => split(LOCATIONS, total, 'location');
export const splitBy = split;

/* One post's traffic
 * ------------------------------------------------------------------------ */

// A launch spike that settles, plus a long tail from search and links
export const postVisitsOn = (profile: Profile, post: FakePost, index: number, offset: number) => {
  if (offset > post.publishedOffset) {
    return 0;
  }
  const daysLive = post.publishedOffset - offset;
  const share = postShare(index);
  const launch = visitsOn(profile, post.publishedOffset) * share * 3;
  return Math.round(launch * Math.exp(-daysLive / 2.2) + visitsOn(profile, offset) * share * 0.15);
};
