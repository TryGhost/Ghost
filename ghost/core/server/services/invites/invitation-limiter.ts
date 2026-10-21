import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { MaxLimit } from '@tryghost/limit-service';

import {
  lockStaffInvites,
  checkTrialStaffLimit,
  STAFF_INVITE_RATE_KEY,
} from '../../lib/staff-invite-usage';

export interface InvitationLimits {
  maxStaff: number;
  maxInvites: number;
  maxRequests: number;
  rateWindowSeconds: number;
}

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
      const row = await lockStaffInvites(transaction);
      const now = this.now();
      const windowEnds = Number(row.firstRequest) + limits.rateWindowSeconds * 1000;
      const inWindow = Number(row.count) > 0 && now < windowEnds;
      if (inWindow && Number(row.count) >= limits.maxRequests) {
        return Math.ceil((windowEnds - now) / 1000);
      }
      await transaction('brute')
        .where({ key: STAFF_INVITE_RATE_KEY })
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
      await lockStaffInvites(transaction);
    }
  }

  async run<T>(email: string, prepare: (transaction?: Knex.Transaction) => Promise<T>): Promise<T> {
    const limits = this.policy();
    if (!limits) {
      return prepare();
    }
    return this.knex.transaction(async (transaction) => {
      await lockStaffInvites(transaction);
      const helpLink = this.getUpgradeUrl();
      const emailLimit = new MaxLimit({
        name: 'staffInvites',
        errors,
        helpLink,
        config: {
          max: limits.maxInvites,
          // Only the threshold matters. The (resource_type, event) index lets
          // this stop after maxInvites entries without counting the full log.
          currentCountQuery: async () => {
            const query = transaction('actions')
              .select('id')
              .where({ resource_type: 'invite', event: 'added' })
              .limit(limits.maxInvites)
              .forUpdate();
            if (['mysql', 'mysql2'].includes(transaction.client.config.client)) {
              // With skewed histories MySQL can prefer the resource-id index
              // and scan thousands of edited/deleted entries before 15 adds.
              query.from(
                transaction.raw('?? FORCE INDEX (??)', [
                  'actions',
                  'actions_resource_type_event_index',
                ]),
              );
            }
            const actions = await query;
            return actions.length;
          },
          error:
            'Your trial allows {{max}} staff invitation emails in total, including resends. Upgrade to send more invitations.',
        },
      });
      await emailLimit.errorIfWouldGoOverLimit();
      await checkTrialStaffLimit(transaction, limits.maxStaff, helpLink, email);
      // Invite.onCreated writes the quota's audit entry inside this transaction.
      // Preparation or audit failures roll back both records before mail is sent.
      return prepare(transaction);
    });
  }
}
