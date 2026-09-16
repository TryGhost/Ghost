import moment from 'moment-timezone';
import { formatNumber } from '@tryghost/shade/utils';
import type { RecipientType } from '@tryghost/admin-x-framework/utils/recipient-filter';

export type PostDisplayName = 'post' | 'page';

/** The publish flow always counts in "subscribers", whatever the newsletter count. */
function subscribers(count: number | null | undefined): string {
  return count === 1 ? 'subscriber' : 'subscribers';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface RecipientLabelInputs {
  recipientType: RecipientType;
  /** Null when the current role cannot read member counts. */
  count: number | null | undefined;
  /** Appended as "of <name>" only when the site has more than one newsletter. */
  newsletterName?: string | null;
}

function joinWords(words: Array<string | null | undefined>): string {
  return words.filter((word): word is string => Boolean(word)).join(' ');
}

/**
 * The collapsed recipients row, e.g. "All 1,234 subscribers of Weekly".
 * Ported from `publish-flow/options.hbs` :78-96, including its "All" prefix
 * only appearing for a plural or unknown count.
 */
export function recipientsRowLabel({
  recipientType,
  count,
  newsletterName,
}: RecipientLabelInputs): string {
  const unknown = count === null || count === undefined;
  const isAll = recipientType === 'all';

  return joinWords([
    isAll && (unknown || count > 1) ? 'All' : null,
    unknown ? null : formatNumber(count),
    isAll ? null : unknown ? capitalize(recipientType) : recipientType,
    subscribers(count),
    newsletterName ? `of ${newsletterName}` : null,
  ]);
}

/**
 * The recipient phrase in the confirm sentence, e.g. "all 1,234 subscribers".
 * Ported from `publish-flow/confirm.hbs` :31-47; unlike the collapsed row, the
 * "all" prefix here is unconditional.
 */
export function recipientsConfirmLabel({ recipientType, count }: RecipientLabelInputs): string {
  const unknown = count === null || count === undefined;
  const isAll = recipientType === 'all';

  return joinWords([
    isAll ? 'all' : null,
    unknown ? null : formatNumber(count),
    isAll ? null : recipientType,
    subscribers(count),
  ]);
}

export type ConfirmPublishType = 'publish+send' | 'publish' | 'send';

// Ember's `buttonTextMap`, less its success copy: the flow replaces the confirm
// step with the complete step, so a success state on this button never renders.
const BUTTON_TEXT = {
  'publish+send': { idle: 'Publish & send', running: 'Publishing & sending' },
  send: { idle: 'Send email', running: 'Sending' },
  publish: { idle: 'Publish', running: 'Publishing' },
  // No idle text: a schedule keeps the underlying publish type's idle copy.
  schedule: { running: 'Scheduling' },
} as const;

export interface ConfirmButtonInputs {
  publishType: ConfirmPublishType;
  isScheduled: boolean;
  scheduledAt: string;
  displayName: PostDisplayName;
  timezone: string;
}

/** `publish-flow/confirm.js` :72-89. */
export function confirmButtonText({
  publishType,
  isScheduled,
  scheduledAt,
  displayName,
  timezone,
}: ConfirmButtonInputs): string {
  let text: string = BUTTON_TEXT[publishType].idle;

  if (publishType === 'publish') {
    text += ` ${displayName}`;
  }

  if (isScheduled) {
    text += `, on ${moment.tz(scheduledAt, timezone).format('MMMM Do')}`;
  } else {
    text += ', right now';
  }

  return text;
}

export function confirmRunningText(publishType: ConfirmPublishType, isScheduled: boolean): string {
  return BUTTON_TEXT[isScheduled ? 'schedule' : publishType].running;
}

/** `publish-flow/confirm.js` :60-70 — derived from the state captured at entry. */
export function confirmPublishType({
  willPublish,
  willEmail,
  willOnlyEmail,
}: {
  willPublish: boolean;
  willEmail: boolean;
  willOnlyEmail: boolean;
}): ConfirmPublishType {
  if (willPublish && willEmail) {
    return 'publish+send';
  }
  if (willOnlyEmail) {
    return 'send';
  }
  return 'publish';
}

/**
 * The site-timezone calendar day, carried in a Date's LOCAL fields. Date pickers
 * read a Date through its local getters, so handing them the instant itself
 * lands on the wrong day whenever the site and browser zones disagree.
 */
export function siteCalendarDay(iso: string, timezone: string): Date {
  const time = moment.tz(iso, timezone);
  return new Date(time.year(), time.month(), time.date());
}

/** `gh-format-post-time` with `relative=true`: plain `moment().from(now)`. */
export function relativeTime(iso: string, now?: Date): string {
  return moment(iso).from(now ? moment(now) : moment.utc());
}

export function formatSiteDateTime(iso: string, timezone: string): string {
  return moment.tz(iso, timezone).format('D MMM YYYY [at] HH:mm');
}

/** The complete step's "today"/"on <date>" variant. */
export function formatScheduledCompletion(iso: string, timezone: string): string {
  const scheduled = moment.tz(iso, timezone);
  const day = scheduled.isSame(moment.tz(timezone), 'day')
    ? 'today'
    : `on ${scheduled.format('MMMM Do')}`;

  return `${day} at ${scheduled.format('HH:mm')}`;
}
