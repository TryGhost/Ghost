import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { MaxLimit } from '@tryghost/limit-service';

import type { lockStaffInvites, checkTrialStaffLimit } from '../../lib/staff-invite-usage';

interface InvitationLimiterDeps {
  knex: Knex;
  getLimits: () => InvitationLimits | undefined;
  now: () => number;
  getUpgradeUrl: () => string | undefined;
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
  private readonly deps: InvitationLimiterDeps;

  constructor(deps: InvitationLimiterDeps) {
    this.deps = deps;
  }

  private policy(): InvitationLimits | undefined {
    const limits = this.deps.getLimits();
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
    return this.deps.knex.transaction(async (transaction) => {
      const row = await this.deps.lockStaffInvites(transaction);
      const now = this.deps.now();
      const windowEnds = Number(row.firstRequest) + limits.rateWindowSeconds * 1000;
      const inWindow = Number(row.count) > 0 && now < windowEnds;
      if (inWindow && Number(row.count) >= limits.maxRequests) {
        return Math.ceil((windowEnds - now) / 1000);
      }
      await transaction('brute')
        .where({ key: this.deps.STAFF_INVITE_RATE_KEY })
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
      await this.deps.lockStaffInvites(transaction);
    }
  }

  async run<T>(email: string, prepare: (transaction?: Knex.Transaction) => Promise<T>): Promise<T> {
    const limits = this.policy();
    if (!limits) {
      return prepare();
    }
    return this.deps.knex.transaction(async (transaction) => {
      await this.deps.lockStaffInvites(transaction);
      const helpLink = this.deps.getUpgradeUrl();
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
      await this.deps.checkTrialStaffLimit(transaction, limits.maxStaff, helpLink, email);
      // Invite.onCreated writes the quota's audit entry inside this transaction.
      // Preparation or audit failures roll back both records before mail is sent.
      return prepare(transaction);
    });
  }
}
