import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { MaxLimit } from '@tryghost/limit-service';

import type { lockStaffInvites, checkTrialStaffLimit } from '../../lib/staff-invite-usage';

interface InvitationLimiterDeps {
  transaction: <T>(callback: (transaction: Knex.Transaction) => Promise<T>) => Promise<T>;
  getLimits: () => InvitationLimits | undefined;
  getUpgradeUrl: () => string | undefined;
  lockStaffInvites: typeof lockStaffInvites;
  checkTrialStaffLimit: typeof checkTrialStaffLimit;
}

export interface InvitationLimits {
  maxStaff: number;
  maxInvites: number;
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
        limits.maxInvites < 0)
    ) {
      throw new errors.IncorrectUsageError({ message: 'Invalid staff invitation limits.' });
    }
    return limits;
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
    return this.deps.transaction(async (transaction) => {
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
              .limit(limits.maxInvites);
            return actions.length;
          },
          error: 'Your trial allows {{max}} staff invitation emails in total, including resends.',
        },
      });
      await emailLimit.errorIfWouldGoOverLimit();
      // This transaction's snapshot starts after acquiring the shared lock.
      await this.deps.checkTrialStaffLimit(transaction, limits.maxStaff, helpLink, email);
      // Invite.onCreated writes the quota's audit entry inside this transaction.
      // Preparation or audit failures roll back both records before mail is sent.
      return prepare(transaction);
    });
  }
}
