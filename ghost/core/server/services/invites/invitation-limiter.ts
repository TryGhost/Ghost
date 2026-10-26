import type { Knex } from 'knex';
import type { LimitService } from '@tryghost/limit-service';
import type { lockStaffInvites } from '../../lib/staff-invite-usage';

interface InvitationLimiterDeps {
  transaction: <T>(callback: (transaction: Knex.Transaction) => Promise<T>) => Promise<T>;
  limitService: Pick<LimitService, 'isLimited' | 'errorIfWouldGoOverLimit'>;
  lockStaffInvites: typeof lockStaffInvites;
}

export default class InvitationLimiter {
  private readonly deps: InvitationLimiterDeps;

  constructor(deps: InvitationLimiterDeps) {
    this.deps = deps;
  }

  private isLimited(): boolean {
    return (
      this.deps.limitService.isLimited('limitTrialStaff') ||
      this.deps.limitService.isLimited('limitTrialStaffInvites')
    );
  }

  async lockStaffUsage(transaction: Knex.Transaction): Promise<void> {
    if (this.isLimited()) {
      await this.deps.lockStaffInvites(transaction);
    }
  }

  async run<T>(email: string, prepare: (transaction?: Knex.Transaction) => Promise<T>): Promise<T> {
    if (!this.isLimited()) {
      return prepare();
    }
    return this.deps.transaction(async (transaction) => {
      await this.deps.lockStaffInvites(transaction);
      const options = { transacting: transaction };
      await this.deps.limitService.errorIfWouldGoOverLimit('limitTrialStaffInvites', options);
      // Replacing a pending invitation does not occupy another seat, even after an import.
      if (this.deps.limitService.isLimited('limitTrialStaff')) {
        const existingInvite = await transaction('invites')
          .where('email', email.trim())
          .forUpdate()
          .first('id');
        if (!existingInvite) {
          await this.deps.limitService.errorIfWouldGoOverLimit('limitTrialStaff', options);
        }
      }
      // Invite.onCreated reserves the email allowance in the same transaction.
      return prepare(transaction);
    });
  }
}
