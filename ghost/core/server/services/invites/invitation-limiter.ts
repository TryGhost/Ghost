import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { LimitService } from '@tryghost/limit-service';
import type { Settings } from '../../models/settings';

const INVITE_EMAIL_COUNTER_KEY = 'staff_invitation_emails';

interface InvitationLimiterDeps {
  transaction: <T>(callback: (transaction: Knex.Transaction) => Promise<T>) => Promise<T>;
  limitService: Pick<LimitService, 'isLimited' | 'errorIfWouldGoOverLimit'>;
  Settings: Pick<typeof Settings, 'findOne'>;
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
      await this.getAndLockInviteEmailCounter(transaction);
    }
  }

  async run<T>(email: string, prepare: (transaction?: Knex.Transaction) => Promise<T>): Promise<T> {
    if (!this.isLimited()) {
      return prepare();
    }
    return this.deps.transaction(async (transaction) => {
      const counterValue = await this.getAndLockInviteEmailCounter(transaction);
      const options = { transacting: transaction };
      if (this.deps.limitService.isLimited('inviteEmails')) {
        await this.reserveEmail(transaction, counterValue);
      }
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
      return prepare(transaction);
    });
  }

  private async getAndLockInviteEmailCounter(
    transaction: Knex.Transaction,
  ): Promise<string | null> {
    const setting = await this.deps.Settings.findOne(
      { key: INVITE_EMAIL_COUNTER_KEY },
      { transacting: transaction, forUpdate: true },
    );
    if (!setting) {
      throw new errors.InternalServerError({
        message: 'Cannot lock the staff invitation email counter.',
      });
    }
    return setting.get('value') as string | null;
  }

  private async reserveEmail(
    transaction: Knex.Transaction,
    counterValue: string | null,
  ): Promise<void> {
    const periodStart = this.deps.getPeriodStart();
    await this.deps.limitService.errorIfWouldGoOverLimit('inviteEmails', {
      transacting: transaction,
    });
    await this.incrementEmailCounter(transaction, counterValue, periodStart);
  }

  private async incrementEmailCounter(
    transaction: Knex.Transaction,
    counterValue: string | null,
    periodStart: string | null,
  ): Promise<void> {
    const previous = JSON.parse(counterValue ?? 'null');
    const count = previous?.periodStart === periodStart ? previous.count : 0;
    // The invitation and reservation commit together. Delivery happens afterwards.
    await transaction('settings')
      .where('key', INVITE_EMAIL_COUNTER_KEY)
      .update({ value: JSON.stringify({ periodStart, count: count + 1 }) });
  }
}
