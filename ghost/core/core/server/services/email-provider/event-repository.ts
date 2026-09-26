import type { Knex } from 'knex';
import ObjectId from 'bson-objectid';
import errors from '@tryghost/errors';
import type { EmailEvent } from '@tryghost/adapter-base-email';
import { toDatabaseDate, fromDatabaseDate } from '../../lib/db-types/date';
import { whereProviderMessageId } from '../lib/where-provider-message-id';
import type { ProcessingResult } from './inbox-repository';

/** Applies local outcomes and safety state in the inbox transaction. */
export class EmailEventRepository {
  async apply(trx: Knex.Transaction, source: string, event: EmailEvent): Promise<ProcessingResult> {
    if (event.family === 'gifts') {
      // Gift outcomes and buyer notifications remain owned by GiftDeliveryService.
      const delivery = await trx('gift_deliveries')
        .where({ email_provider_source: source, recipient_email: event.recipientEmail })
        .modify(whereProviderMessageId, 'email_provider_message_id', event.providerId)
        .first();
      if (!delivery) {
        throw new errors.NotFoundError({ message: 'Gift email recipient is not available yet' });
      }
      const result: ProcessingResult = {};
      await this.applySuppression(trx, event, result);
      return result;
    }
    const newsletter = event.family === 'newsletters';
    const table = newsletter ? 'email_recipients' : 'automated_email_recipients';
    const query = trx(table)
      .select(`${table}.*`)
      .where(`${table}.member_email`, event.recipientEmail);
    if (newsletter) {
      query
        .join('email_batches', 'email_batches.id', 'email_recipients.batch_id')
        .where('email_batches.email_provider_source', source);
      if (event.emailId) {
        query.where('email_recipients.email_id', event.emailId);
      } else {
        query.modify(whereProviderMessageId, 'email_batches.mailgun_message_id', event.providerId);
      }
    } else {
      query
        .where({ email_provider_source: source })
        .modify(whereProviderMessageId, 'mailgun_message_id', event.providerId);
    }
    const recipient = await query.forUpdate().first();
    if (!recipient) {
      throw new errors.NotFoundError({ message: 'Email recipient is not available yet' });
    }
    const timestamp = toDatabaseDate(event.timestamp);
    const result: ProcessingResult = {
      memberId: recipient.member_id,
      ...(newsletter ? { emailId: recipient.email_id } : {}),
    };
    if (event.type === 'delivered' || event.type === 'opened') {
      const column = event.type === 'delivered' ? 'delivered_at' : 'opened_at';
      await trx(table)
        .where({ id: recipient.id })
        .update({
          [column]: trx.raw('CASE WHEN ?? IS NULL OR ?? > ? THEN ? ELSE ?? END', [
            column,
            column,
            timestamp,
            timestamp,
            column,
          ]),
        });
      if (
        !newsletter &&
        event.type === 'opened' &&
        !recipient.opened_at &&
        recipient.automation_action_revision_id
      ) {
        await trx('automation_action_revisions')
          .where({ id: recipient.automation_action_revision_id })
          .update({ email_opened_count: trx.raw('COALESCE(email_opened_count, 0) + 1') });
      }
      if (newsletter && event.type === 'opened') {
        await trx('members')
          .where({ id: recipient.member_id })
          .where((builder) =>
            builder.whereNull('last_seen_at').orWhere('last_seen_at', '<', timestamp),
          )
          .update({ last_seen_at: timestamp });
      }
    }
    if (newsletter && event.type === 'failed') {
      if (event.severity === 'permanent') {
        await trx(table)
          .where({ id: recipient.id })
          .update({
            failed_at: trx.raw(
              'CASE WHEN failed_at IS NULL OR failed_at > ? THEN ? ELSE failed_at END',
              [timestamp, timestamp],
            ),
          });
      }
      const failure = await trx('email_recipient_failures')
        .where({ email_recipient_id: recipient.id })
        .first();
      if (
        !failure ||
        (failure.severity !== 'permanent' &&
          (event.severity === 'permanent' ||
            fromDatabaseDate(failure.failed_at) <= event.timestamp))
      ) {
        const data = {
          email_id: recipient.email_id,
          member_id: recipient.member_id,
          email_recipient_id: recipient.id,
          severity: event.severity,
          failed_at: timestamp,
          event_id: event.id.slice(0, 255),
          code:
            typeof event.error?.code === 'number' &&
            Number.isInteger(event.error.code) &&
            event.error.code >= 0
              ? event.error.code
              : 0,
          enhanced_code: event.error?.enhancedCode?.slice(0, 50) ?? null,
          message: (
            event.error?.message || `Email delivery failed (${event.error?.code ?? event.severity})`
          ).slice(0, 2000),
        };
        if (failure) {
          await trx('email_recipient_failures').where({ id: failure.id }).update(data);
        } else {
          await trx('email_recipient_failures').insert({ id: ObjectId().toHexString(), ...data });
        }
      }
    }
    // Safety applies to the original address. An old event must not disable
    // a member's new address after they update their account.
    const member = await trx('members')
      .where({ id: recipient.member_id, email: event.recipientEmail })
      .first();
    await this.applySuppression(trx, event, result);
    if (event.type === 'complained' || event.suppress) {
      if (newsletter && member && event.type === 'complained') {
        await trx('email_spam_complaint_events')
          .insert({
            id: ObjectId().toHexString(),
            member_id: member.id,
            email_id: recipient.email_id,
            email_address: event.recipientEmail,
            created_at: timestamp,
          })
          .onConflict(['email_id', 'member_id'])
          .ignore();
      }
    }
    if (event.type === 'unsubscribed') {
      if (member) {
        if (newsletter) {
          const email = await trx('emails').where({ id: recipient.email_id }).first();
          if (!email) {
            throw new errors.NotFoundError({ message: 'Newsletter email was not found' });
          }
          const removed = await trx('members_newsletters')
            .where({ member_id: member.id, newsletter_id: email.newsletter_id })
            .delete();
          if (removed) {
            await trx('members_subscribe_events').insert({
              id: ObjectId().toHexString(),
              member_id: member.id,
              newsletter_id: email.newsletter_id,
              subscribed: false,
              source: 'system',
              created_at: timestamp,
            });
          }
        } else {
          await trx('members')
            .where({ id: member.id })
            .update({ enable_updates_and_announcements: false });
        }
      }
      result.cleanup = 'unsubscribe';
    }
    return result;
  }
  private async applySuppression(
    trx: Knex.Transaction,
    event: EmailEvent,
    result: ProcessingResult,
  ): Promise<void> {
    if (event.type !== 'complained' && !event.suppress) {
      return;
    }
    await trx('suppressions')
      .insert({
        id: ObjectId().toHexString(),
        email: event.recipientEmail,
        email_id: result.emailId ?? null,
        reason: event.type === 'complained' ? 'spam' : 'bounce',
        created_at: toDatabaseDate(event.timestamp),
      })
      .onConflict('email')
      .ignore();
    await trx('members').where({ email: event.recipientEmail }).update({ email_disabled: true });
    if (event.type === 'complained') {
      result.cleanup = 'complaint';
    }
  }
}
