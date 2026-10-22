import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { MaxLimit } from '@tryghost/limit-service';

import type { lockStaffInvites, checkTrialStaffLimit } from '../../lib/staff-invite-usage';

interface Dependencies {
  lockStaffInvites: typeof lockStaffInvites;
  checkTrialStaffLimit: typeof checkTrialStaffLimit;
  STAFF_INVITE_RATE_KEY: string;
}

export interface InvitationLimits {
  maxStaff: number;
  maxInvites: number;
  maxRequests: number;
  rateWindowSeconds: number;
}

/** A host-enabled trial allowance, independent of the mutable invitation list. */
export default class InvitationLimiter {
  private readonly dependencies: Dependencies;
  private readonly knex: Knex;
  private readonly getLimits: () => InvitationLimits | undefined;
  private readonly now: () => number;
  private readonly getUpgradeUrl: () => string | undefined;

  constructor(
    dependencies: Dependencies,
    knex: Knex,
    getLimits: () => InvitationLimits | undefined,
    now: () => number = Date.now,
    getUpgradeUrl: () => string | undefined = () => undefined,
  ) {
    this.dependencies = dependencies;
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
        !Number.isSafeInteger(limits.maxRequests) ||
        limits.maxRequests < 1 ||
        !Number.isSafeInteger(limits.rateWindowSeconds) ||
        limits.rateWindowSeconds < 1)
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
      const row = await this.dependencies.lockStaffInvites(transaction);
      const now = this.now();
      const windowEnds = Number(row.firstRequest) + limits.rateWindowSeconds * 1000;
      const inWindow = Number(row.count) > 0 && now < windowEnds;
      if (inWindow && Number(row.count) >= limits.maxRequests) {
        return Math.ceil((windowEnds - now) / 1000);
      }
      await transaction('brute')
        .where({ key: this.dependencies.STAFF_INVITE_RATE_KEY })
        .update({
          firstRequest: inWindow ? row.firstRequest : now,
          lastRequest: now,
          lifetime: inWindow ? windowEnds : now + limits.rateWindowSeconds * 1000,
          count: inWindow ? Number(row.count) + 1 : 1,
        });
      return 0;
    });
  }

  async lockStaffUsage(transaction: Knex.Transaction): Promise<void> {
    if (this.policy()) {
      await this.dependencies.lockStaffInvites(transaction);
    }
  }

  async run<T>(email: string, prepare: (transaction?: Knex.Transaction) => Promise<T>): Promise<T> {
    const limits = this.policy();
    if (!limits) {
      return prepare();
    }
    return this.knex.transaction(async (transaction) => {
      await this.dependencies.lockStaffInvites(transaction);
      const helpLink = this.getUpgradeUrl();
      const emailLimit = new MaxLimit({
        name: 'staffInvites',
        errors,
        helpLink,
        config: {
          max: limits.maxInvites,
          // Only the threshold matters. LIMIT bounds returned rows, not rows scanned;
          // use the existing schema and let the database choose its query plan.
          currentCountQuery: async () => {
            const actions = await transaction('actions')
              .select('id')
              .where({ resource_type: 'invite', event: 'added' })
              .limit(limits.maxInvites)
              .forUpdate();
            return actions.length;
          },
          error:
            'Your trial allows {{max}} staff invitation emails in total, including resends. Upgrade to send more invitations.',
        },
      });
      await emailLimit.errorIfWouldGoOverLimit();
      await this.dependencies.checkTrialStaffLimit(transaction, limits.maxStaff, helpLink, email);
      // Invite.onCreated writes the quota's audit entry inside this transaction.
      // Preparation or audit failures roll back both records before mail is sent.
      return prepare(transaction);
    });
  }
}
