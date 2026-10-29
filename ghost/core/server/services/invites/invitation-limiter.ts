import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { LimitService } from '@tryghost/limit-service';
import type { lockStaffInvites } from '../../lib/staff-invite-usage';

interface InvitationLimiterDeps {
  transaction: <T>(callback: (transaction: Knex.Transaction) => Promise<T>) => Promise<T>;
  limitService: Pick<LimitService, 'isLimited' | 'errorIfWouldGoOverLimit'>;
  lockStaffInvites: typeof lockStaffInvites;
  getPeriodStart: () => string | null;
}

export default class InvitationLimiter {
  private readonly deps: InvitationLimiterDeps;

  constructor(deps: InvitationLimiterDeps) {
    this.deps = deps;
  }

  private isLimited(): boolean {
    return (
      this.deps.limitService.isLimited('allStaff') ||
      this.deps.limitService.isLimited('inviteEmails')
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
      const setting = await this.deps.lockStaffInvites(transaction);
      const options = { transacting: transaction };
      const periodStart = await this.checkEmailAllowance(transaction);
      // Replacing a pending invitation does not occupy another seat, even after an import.
      if (this.deps.limitService.isLimited('allStaff')) {
        const existingInvite = await transaction('invites')
          .where('email', email.trim())
          .forUpdate()
          .first('id');
        if (!existingInvite) {
          await this.deps.limitService.errorIfWouldGoOverLimit('allStaff', options);
        }
      }
      const result = await prepare(transaction);
      if (this.deps.limitService.isLimited('inviteEmails')) {
        const previous = JSON.parse(setting.value ?? 'null');
        const count = previous?.periodStart === periodStart ? previous.count : 0;
        // The invitation and reservation commit together. Delivery happens afterwards.
        // This internal counter is read from the database, never the settings cache.
        await transaction('settings')
          .where('key', 'staff_invitation_emails')
          .update({
            value: JSON.stringify({ periodStart, count: count + 1 }),
          });
      }
      return result;
    });
  }

  private async checkEmailAllowance(transaction: Knex.Transaction): Promise<string | null> {
    // Capture the checked period before preparing the invitation. A later commit
    // still belongs to that period. Only repeat if the check itself crosses a reset.
    for (;;) {
      const periodStart = this.deps.getPeriodStart();
      try {
        await this.deps.limitService.errorIfWouldGoOverLimit('inviteEmails', {
          transacting: transaction,
        });
      } catch (error) {
        if (
          !(error instanceof errors.HostLimitError) ||
          this.deps.getPeriodStart() === periodStart
        ) {
          throw error;
        }
        continue;
      }
      if (this.deps.getPeriodStart() === periodStart) {
        return periodStart;
      }
    }
  }
}
