import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { LimitService } from '@tryghost/limit-service';
import type { Settings } from '../../models/settings';

const INVITE_EMAIL_COUNTER_KEY = 'invite_emails_limit_usage';

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
      this.deps.limitService.isLimited('staff') ||
      this.deps.limitService.isLimited('allStaff') ||
      this.deps.limitService.isLimited('inviteEmails')
    );
  }

  async run<T>(
    invite: { email: string; role_id: string },
    prepare: (transaction?: Knex.Transaction) => Promise<T>,
  ): Promise<T> {
    if (!this.isLimited()) {
      return prepare();
    }
    return this.deps.transaction(async (transaction) => {
      const options = { transacting: transaction };
      const counterValue =
        this.deps.limitService.isLimited('allStaff') ||
        this.deps.limitService.isLimited('inviteEmails')
          ? await this.getAndLockInviteEmailCounter(transaction)
          : null;
      const email = invite.email.trim();
      const existingInvite = await transaction('invites')
        .where({ email })
        .forUpdate()
        .first('role_id');
      // Acceptance may have completed since the API's permission check.
      const registered = await transaction('users').where({ email }).first('id');
      if (registered) {
        throw new errors.ValidationError({
          message: 'User is already registered.',
          code: 'USER_ALREADY_REGISTERED',
        });
      }
      if (this.deps.limitService.isLimited('inviteEmails')) {
        await this.reserveEmail(transaction, counterValue);
      }
      // Replacing a pending invitation does not occupy another seat, even after an import.
      if (this.deps.limitService.isLimited('allStaff') && !existingInvite) {
        await this.deps.limitService.errorIfWouldGoOverLimit('allStaff', options);
      }
      if (this.deps.limitService.isLimited('staff')) {
        await this.checkStaffLimit(transaction, invite.role_id, existingInvite?.role_id);
      }
      return prepare(transaction);
    });
  }

  private async checkStaffLimit(
    transaction: Knex.Transaction,
    roleId: string,
    previousRoleId?: string,
  ): Promise<void> {
    const contributor = await transaction('roles').where('name', 'Contributor').first('id');
    if (roleId === contributor.id) {
      return;
    }
    await this.deps.limitService.errorIfWouldGoOverLimit('staff', {
      transacting: transaction,
      addedCount: previousRoleId && previousRoleId !== contributor.id ? 0 : 1,
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
