import moment from 'moment-timezone';

/**
 * How a post's date reads in the list.
 *
 * Ported from `apps/ember-admin/app/helpers/gh-format-post-time.js`. The
 * branches are order-dependent and the order is load-bearing:
 *
 * - anything within 12 hours either way reads as relative ("2 hours ago",
 *   "in 2 hours"), which beats every absolute format;
 * - "yesterday" is checked before "tomorrow", because published posts vastly
 *   outnumber scheduled ones.
 *
 * `now` is injectable so the branches can be tested without freezing time.
 */
export interface FormatPostTimeOptions {
  timezone?: string;
  /** Renders as a sentence fragment: "at 09:00 (UTC) on 01 Sep 2026". */
  scheduled?: boolean;
  /** Enables the "yesterday" branch. */
  absolute?: boolean;
  /** Date only, no time. */
  short?: boolean;
  now?: Date;
}

function utcOffsetLabel(time: moment.Moment): string {
  if (time.utcOffset() === 0) {
    return '(UTC)';
  }

  // +02:00 -> +2, but +05:30 keeps its minutes.
  const offset = time
    .format('Z')
    .replace(/([+-])0/, '$1')
    .replace(/:00/, '');

  return `(UTC${offset})`;
}

export function formatPostTime(
  time: string | null | undefined,
  { timezone = 'etc/UTC', scheduled, absolute, short, now }: FormatPostTimeOptions = {},
): string {
  if (!time) {
    return '';
  }

  const target = moment.tz(time, timezone);
  const reference = moment.tz(now ?? moment.utc(), timezone);

  if (!target.isValid()) {
    return '';
  }

  const offset = utcOffsetLabel(target);

  // A draft edited, a post published, or a post scheduled within 12 hours.
  if (Math.abs(reference.diff(target, 'hours')) <= 12) {
    return target.from(reference);
  }

  if (target.isSame(reference, 'day')) {
    const formatted = target.format(`HH:mm [${offset}] [Today]`);
    return scheduled ? `at ${formatted}` : formatted;
  }

  // Before the scheduled/tomorrow branch on purpose - see the note above.
  if (absolute && target.isSame(reference.clone().subtract(1, 'days').startOf('day'), 'day')) {
    return short ? target.format('[Yesterday]') : target.format(`HH:mm [${offset}] [yesterday]`);
  }

  if (scheduled && target.isSame(reference.clone().add(1, 'days').startOf('day'), 'day')) {
    return target.format(`[at] HH:mm [${offset}] [tomorrow]`);
  }

  if (scheduled) {
    return target.format(`[at] HH:mm [${offset}] [on] DD MMM YYYY`);
  }

  return short ? target.format('DD MMM YYYY') : target.format(`HH:mm [${offset}] DD MMM YYYY`);
}
