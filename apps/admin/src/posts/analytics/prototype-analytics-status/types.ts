// PROTOTYPE ONLY — not production code. See ./README.md
//
// Sending and counting are two INDEPENDENT dimensions, not one enum.
//
// A send can fail at 12:04 while the batches that did go out are generating
// opens, and the analytics watermark can be 90 minutes behind at the same
// time. Modelling this as a single state forces the UI to pick one truth and
// hide the other, which is exactly the moment a publisher most needs both.
//
// Both dimensions come from data Ghost already has:
//
//   Sending  - `emails.status`, plus per-batch rows from
//              GET /emails/:id/batches?include=count.recipients, which returns
//              each batch's status AND its recipient count. That is where an
//              exact "X of Y members" comes from.
//   Counting - GET /emails/:id/analytics, whose `lastEventTimestamp` is the
//              watermark: every provider event up to it has been counted.
//
// NOTE: `emails.failed_count` is NOT the submission-failure number. It counts
// `email_recipients.failed_at`, i.e. bounces the provider reported after
// accepting the mail. Recipients in a rejected batch were never handed over at
// all, so they carry no delivery result and are absent from every count.
// Showing failed_count as "didn't send" would be plainly wrong.

/** Whether Ghost got the mail to the provider. Local to Ghost, known immediately. */
export type SendState =
  /**
   * Publishing has happened, but nothing has gone out: Ghost is still building
   * the recipient list and cutting it into batches. Real, and the only stretch
   * where there is genuinely nothing to count rather than nothing counted yet.
   */
  | 'preparing'
  /** Batches still being handed over. */
  | 'sending'
  /** Every batch accepted. */
  | 'submitted'
  /** Some batches accepted, some rejected. */
  | 'partiallyFailed'
  /** Nothing was accepted. */
  | 'failed';

/** How current the polled open/delivery data is. Independent of the above. */
/**
 * Three states, because there are only three things a reader can do anything
 * with: nothing has been processed, some has, all of it has. How far behind the
 * cursor was is a fourth axis dressed as a state — it changed the wording and
 * the tone without ever changing what was true or what to do about it, and
 * "far behind" in particular asserted a problem where there was only a clock.
 */
export type CountingState =
  /** No cycle has yet covered this send, so zero opens is expected. */
  | 'notStarted'
  /** Results are arriving: some are in, the rest are still to come. */
  | 'counting'
  /** Every event up to now has been counted. */
  | 'current';

export interface AnalyticsStatus {
  send: {
    state: SendState;
    /** Intended recipients (`emails.email_count`). */
    recipientCount: number;
    /** Recipients in batches the provider accepted. */
    reachedCount: number;
    /**
     * How far list-building has got, 0-1. Only meaningful while `preparing`,
     * and the only quantity that exists in that stretch: there is no recipient
     * count to report a fraction of yet, because assembling the list is the
     * work being done. Ghost knows it because it knows how many members the
     * segment matches before it starts cutting batches.
     */
    preparedFraction: number;
    /** `emails.submitted_at` — when Ghost began sending. */
    startedAt: Date;
    /** `MAX(email_batches.updated_at)` — when the last batch went out. Null while sending. */
    finishedAt: Date | null;
  };
  counting: {
    state: CountingState;
    /** Every open/delivery event up to here has been counted. */
    countedThrough: Date | null;
    lagMinutes: number;
    /** `emails.delivered_count` — confirmed delivered in reports fetched so far. */
    deliveredCount: number;
    /**
     * `emails.failed_count` — recipients with `failed_at` set, which only
     * permanent failures do. `handleTemporaryFailed` deliberately does not
     * touch it, so a deferred inbox that later succeeds is never counted here.
     * That makes this a true hard-bounce figure.
     */
    bouncedCount: number;
    /** `MIN(email_recipients.delivered_at)` — the first confirmed delivery. */
    firstDeliveryAt: Date | null;
  };
}

/**
 * What every chart built on send data does while that send is unresolved.
 *
 * An open rate is opens over deliveries, and until every email has an outcome
 * the denominator is still moving. The figure is not merely imprecise, it is
 * reliably LOW — and it is at its lowest in the first hour, which is exactly
 * when publishers look. A number that says "this post underperformed" and then
 * quietly doubles is worse than no number.
 *
 * Cards keep their header and their place in the grid, and only the data area
 * is replaced — the same shape every other empty state on these pages uses.
 *
 * It lifts on the first recorded event rather than on a finished send. There is
 * a real difference between "these numbers are incomplete", which is true of
 * analytics permanently and is what "so far" is for, and "there are no numbers",
 * which is the only thing an empty state can honestly claim.
 */
export type EmailDataTreatment = 'off' | 'hidden';

export const EMAIL_DATA_TREATMENTS: { value: EmailDataTreatment; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'hidden', label: 'Hidden until sent' },
];

/** Which stubbed UI treatment is active. */
export type StatusVariant =
  | 'off'
  | 'activityLog'
  | 'stageCard'
  | 'statusLine'
  | 'sendingOnly'
  | 'gatedUntilSent';

export const STATUS_VARIANTS: { value: StatusVariant; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'activityLog', label: 'A. Send log' },
  { value: 'stageCard', label: 'B. Stage card' },
  { value: 'statusLine', label: 'C. Status line' },
  { value: 'sendingOnly', label: 'D. Sending only' },
  { value: 'gatedUntilSent', label: 'E. Gated until sent' },
];

/**
 * Sending is over and every batch was accepted, so there is nothing left for a
 * send status to report. Deliberately NOT `isSendFullyAccountedFor`: that waits
 * on the last bounce report, which is a counting fact, and variant D's card
 * refuses to speak about counting at all. Its subject is the handover, and the
 * handover finishes here.
 */
export const isSendComplete = (status: AnalyticsStatus): boolean =>
  status.send.state === 'submitted';

export const SEND_STATES: { value: SendState; label: string }[] = [
  { value: 'preparing', label: 'Preparing' },
  { value: 'sending', label: 'Still sending' },
  { value: 'submitted', label: 'All sent' },
  { value: 'partiallyFailed', label: 'Partly failed' },
  { value: 'failed', label: 'Failed entirely' },
];

export const COUNTING_STATES: { value: CountingState; label: string }[] = [
  { value: 'notStarted', label: 'Not processed yet' },
  { value: 'counting', label: 'Counting' },
  { value: 'current', label: 'Up to date' },
];

/**
 * Appended to every failure message, in one place so the four variants cannot
 * drift into four wordings of the same promise. It answers the question a
 * failure actually raises — not "what happened" but "does anyone know" — which
 * is otherwise the reason a publisher opens a support ticket to report
 * something Ghost already knows about.
 */
export const ENGINEERS_NOTIFIED = 'Our engineers have been notified.';

/** Every sent email now sits in one of the two buckets: nothing left unknown. */
export const isSendFullyAccountedFor = (status: AnalyticsStatus): boolean =>
  status.send.state !== 'sending' &&
  status.send.reachedCount > 0 &&
  status.counting.deliveredCount + status.counting.bouncedCount >= status.send.reachedCount;
