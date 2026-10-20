import { createHash } from 'node:crypto';
import type { Knex } from 'knex';
import errors from '@tryghost/errors';

export interface InvitationLimits {
  maxPerDay?: number;
  cooldownSeconds: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SITE_KEY = 'staff-invites:site';

/**
 * Reserves email allowance before sending, using the site's existing brute table.
 * Admission and invite replacement commit together. Transport failures keep their
 * reservation because a timeout does not establish that an email wasn't sent.
 */
export default class InvitationLimiter {
  private readonly knex: Knex;
  private readonly getLimits: () => InvitationLimits | undefined;
  private readonly now: () => number;

  constructor(
    knex: Knex,
    getLimits: () => InvitationLimits | undefined,
    now: () => number = Date.now,
  ) {
    this.knex = knex;
    this.getLimits = getLimits;
    this.now = now;
  }

  async run<T>(email: string, prepare: (transaction?: Knex.Transaction) => Promise<T>): Promise<T> {
    const limits = this.getLimits();
    if (!limits) {
      return prepare();
    }
    if (
      !Number.isSafeInteger(limits.cooldownSeconds) ||
      limits.cooldownSeconds <= 0 ||
      (limits.maxPerDay !== undefined &&
        (!Number.isSafeInteger(limits.maxPerDay) || limits.maxPerDay < 0))
    ) {
      throw new errors.IncorrectUsageError({ message: 'Invalid staff invitation limits.' });
    }

    const recipientKey = `staff-invites:recipient:${createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex')}`;

    return this.knex.transaction(async (transaction) => {
      // Upsert acquires a write lock even on the first concurrent requests.
      // All invitation admissions lock this row first, including cooldown-only policies.
      await transaction('brute')
        .insert({
          key: SITE_KEY,
          firstRequest: 0,
          lastRequest: 0,
          lifetime: this.now() + DAY_MS,
          count: 0,
        })
        .onConflict('key')
        .merge(['key']);
      const site = await transaction('brute').where({ key: SITE_KEY }).forUpdate().first();
      const now = this.now();
      const dayStart = Math.floor(now / DAY_MS) * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const count = Number(site.firstRequest) === dayStart ? Number(site.count) : 0;
      const recipient = await transaction('brute').where({ key: recipientKey }).first();

      if (recipient && Number(recipient.lifetime) > now) {
        const wait = Math.ceil((Number(recipient.lifetime) - now) / 1000);
        throw new errors.TooManyRequestsError({
          message: `An invitation was recently sent to this address. Try again in ${wait} seconds.`,
          code: 'STAFF_INVITE_COOLDOWN',
        });
      }
      if (limits.maxPerDay !== undefined && count >= limits.maxPerDay) {
        throw new errors.TooManyRequestsError({
          message: `Your site has reached its daily limit of ${limits.maxPerDay} staff invitation emails. Try again after midnight UTC or contact support.`,
          code: 'STAFF_INVITE_DAILY_LIMIT',
        });
      }

      const result = await prepare(transaction);
      const preparedAt = this.now();
      await transaction('brute')
        .where({ key: SITE_KEY })
        .update({
          firstRequest: dayStart,
          lastRequest: preparedAt,
          lifetime: Math.max(dayEnd, preparedAt + limits.cooldownSeconds * 1000),
          count: count + 1,
        });
      await transaction('brute')
        .insert({
          key: recipientKey,
          firstRequest: preparedAt,
          lastRequest: preparedAt,
          lifetime: preparedAt + limits.cooldownSeconds * 1000,
          count: 1,
        })
        .onConflict('key')
        .merge();
      return result;
    });
  }
}
