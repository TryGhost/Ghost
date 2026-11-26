import type { Knex } from 'knex';
import type { Site } from '#support/site';
import { db } from '../../../shared/transition/db';

/** Counts of who newsletters were recently sent to, which the verification trigger weighs. */
export class RecentEmailRecipients {
  knex: Knex;

  constructor({ knex }: { knex: Knex }) {
    this.knex = knex;
  }

  /** Sums newsletter recipients since the given date. */
  async countSince(since: string): Promise<number> {
    const result = await this.knex('emails')
      .sum('email_count', { as: 'count' })
      .where('created_at', '>', since)
      .first();

    return Number(result?.count) || 0;
  }

  // Matched on address, not member id, so changing a member's email counts as removing them.
  // The limit lets a clear case stop early rather than scanning every recipient
  async countRemovedSince(since: string, limit: number): Promise<number> {
    const rows = await this.knex('email_recipients as er')
      .distinct('er.member_email')
      .join('emails as e', 'e.id', 'er.email_id')
      .leftJoin('members as m', 'm.email', 'er.member_email')
      .where('e.created_at', '>', since)
      .whereNull('m.id')
      .limit(limit);

    return rows.length;
  }
}

export const recentEmailRecipients = (site: Site) =>
  new RecentEmailRecipients({ knex: db(site).knex });
