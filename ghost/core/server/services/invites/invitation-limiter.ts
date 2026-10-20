import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { MaxLimit } from '@tryghost/limit-service';

import {
  lockTrialUsage,
  checkTrialStaffLimit,
  TRIAL_USAGE_KEY,
} from '../../lib/staff-invite-usage';

export interface InvitationLimits {
  maxStaff: number;
  maxInvites: number;
  minIntervalSeconds: number;
}

const RATE_KEY = 'staff-invites:requests';

/** A host-enabled trial allowance, independent of the mutable invitation list. */
export default class InvitationLimiter {
  private readonly knex: Knex;
  private readonly getLimits: () => InvitationLimits | undefined;
  private readonly now: () => number;
  private readonly getUpgradeUrl: () => string | undefined;

  constructor(
    knex: Knex,
    getLimits: () => InvitationLimits | undefined,
    now: () => number = Date.now,
    getUpgradeUrl: () => string | undefined = () => undefined,
  ) {
    this.knex = knex;
    this.getLimits = getLimits;
    this.now = now;
    this.getUpgradeUrl = getUpgradeUrl;
  }

  private policy(): InvitationLimits | undefined {
    const limits = this.getLimits();
    if (
      limits &&
      (!Number.isSafeInteger(limits.maxStaff) ||
        limits.maxStaff < 1 ||
        !Number.isSafeInteger(limits.maxInvites) ||
        limits.maxInvites < 0 ||
        !Number.isSafeInteger(limits.minIntervalSeconds) ||
        limits.minIntervalSeconds < 1)
    ) {
      throw new errors.IncorrectUsageError({ message: 'Invalid staff invitation limits.' });
    }
    return limits;
  }

  /** Returns seconds to wait. Admission is atomic across processes and IPs. */
  async rateLimit(): Promise<number> {
    const limits = this.policy();
    if (!limits) {
      return 0;
    }
    return this.knex.transaction(async (transaction) => {
      await transaction('brute')
        .insert({
          key: RATE_KEY,
          firstRequest: 0,
          lastRequest: 0,
          lifetime: 0,
          count: 0,
        })
        .onConflict('key')
        .merge(['key']);
      const row = await transaction('brute').where({ key: RATE_KEY }).forUpdate().first();
      const now = this.now();
      const nextRequest = Number(row.lastRequest) + limits.minIntervalSeconds * 1000;
      if (Number(row.count) > 0 && now < nextRequest) {
        return Math.ceil((nextRequest - now) / 1000);
      }
      await transaction('brute')
        .where({ key: RATE_KEY })
        .update({
          firstRequest: now,
          lastRequest: now,
          lifetime: now + limits.minIntervalSeconds * 1000,
          count: 1,
        });
      return 0;
    });
  }

  async lockStaffUsage(transaction: Knex.Transaction): Promise<void> {
    if (this.policy()) {
      await lockTrialUsage(transaction);
    }
  }

  async run<T>(email: string, prepare: (transaction?: Knex.Transaction) => Promise<T>): Promise<T> {
    const limits = this.policy();
    if (!limits) {
      return prepare();
    }
    return this.knex.transaction(async (transaction) => {
      const usage = await lockTrialUsage(transaction);
      const helpLink = this.getUpgradeUrl();
      const emailLimit = new MaxLimit({
        name: 'staffInvites',
        errors,
        helpLink,
        config: {
          max: limits.maxInvites,
          currentCountQuery: async () => Number(usage.count),
          error:
            'Your trial allows {{max}} staff invitation emails in total, including resends. Upgrade to send more invitations.',
        },
      });
      await emailLimit.errorIfWouldGoOverLimit();
      await checkTrialStaffLimit(transaction, limits.maxStaff, helpLink, email);
      const result = await prepare(transaction);
      await transaction('staff_invite_usage').where({ key: TRIAL_USAGE_KEY }).increment('count', 1);
      return result;
    });
  }
}
