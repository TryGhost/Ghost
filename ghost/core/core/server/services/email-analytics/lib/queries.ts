import _ from 'lodash';
import debugFactory from '@tryghost/debug';
import logging from '@tryghost/logging';
import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
import type { JsonObject } from 'type-fest';

const debug = debugFactory('services:email-analytics');

const MIN_EMAIL_COUNT_FOR_OPEN_RATE = 5;

type EmailAnalyticsJobName = string;
type EmailAnalyticsEvent = 'delivered' | 'opened' | 'failed';
type CursorSeed = {
  tableName: string;
  eventColumns: Partial<Record<EmailAnalyticsEvent, string>>;
};

type JobMetadata = {
  begin: null | string;
  end: null | string;
};
type JobData = {
  finished_at: null | Date;
  started_at: null | Date;
  metadata: JobMetadata;
};

/**
 * Creates a job in the jobs table if it does not already exist.
 * @param jobName - The name of the job to create.
 */
async function createJobIfNotExists(knex: Knex, jobName: EmailAnalyticsJobName): Promise<void> {
  await knex('jobs')
    .insert({
      id: new ObjectID().toHexString(),
      name: jobName,
      started_at: new Date(),
      created_at: new Date(),
      status: 'started',
    })
    .onConflict('name')
    .ignore();
}

function parseJsonObject(raw: unknown): JsonObject | null {
  if (typeof raw !== 'string') {
    return null;
  }
  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    return null;
  }
  return result && typeof result === 'object' && !Array.isArray(result) ? result : null;
}

function getStringValue(obj: JsonObject, key: string): string | null {
  const result = obj[key];
  return typeof result === 'string' ? result : null;
}

function parseJobMetadata(rawMetadata: unknown): JobMetadata {
  const parsed = parseJsonObject(rawMetadata) || {};
  return {
    begin: getStringValue(parsed, 'begin'),
    end: getStringValue(parsed, 'end'),
  };
}

export class Queries {
  #knex: Knex;

  constructor(knex: Knex) {
    this.#knex = knex;
  }

  /**
   * Retrieves the timestamp of the last seen event for the specified email analytics events.
   * @param jobName - The name of the job to update.
   * @param events - The email analytics events to consider.
   * @param cursorSeed - Recipient table and timestamp columns to read the initial cursor from. Used when the job has no stored timestamp yet.
   * @returns The timestamp of the last seen event, or null if no events are found.
   */
  async getLastEventTimestamp(
    jobName: EmailAnalyticsJobName,
    events: EmailAnalyticsEvent[],
    cursorSeed: CursorSeed,
  ): Promise<Date | null> {
    const knex = this.#knex;

    const startDate = new Date();

    let timestamps: (Date | string | null)[] = [];
    const lastJobRunTimestamp = await this.getLastJobRunTimestamp(jobName);

    if (lastJobRunTimestamp) {
      debug(`Using job data for ${jobName}`);
      timestamps = [lastJobRunTimestamp];
    } else {
      debug(`Job data not found for ${jobName}, using ${cursorSeed.tableName} data`);
      logging.info(`Job data not found for ${jobName}, using ${cursorSeed.tableName} data`);

      for (const event of events) {
        const columnName = cursorSeed.eventColumns[event];
        if (!columnName) {
          continue;
        }
        const row = await knex(cursorSeed.tableName)
          .select(knex.raw('MAX(??) as maxTimestamp', [columnName]))
          .first();
        timestamps.push(row.maxTimestamp);
      }

      await createJobIfNotExists(knex, jobName);
    }

    // Convert string dates to Date objects for SQLite compatibility
    const normalizedTimestamps = timestamps.map((date) => {
      if (!date) {
        return null;
      }
      return date instanceof Date ? date : new Date(date);
    });

    const lastSeenEventTimestamp = _.max(normalizedTimestamps) ?? null;
    debug(`getLastEventTimestamp: finished in ${Date.now() - startDate.getTime()}ms`);

    return lastSeenEventTimestamp;
  }

  /**
   * Retrieves the job data for the specified job name.
   * @param jobName - The name of the job to retrieve data for.
   * @returns The job data, or null if no job data is found.
   */
  async getJobData(jobName: EmailAnalyticsJobName): Promise<JobData | null> {
    const row = await this.#knex('jobs')
      .select('finished_at', 'started_at', 'metadata')
      .where('name', jobName)
      .first();
    return row
      ? {
          finished_at: row.finished_at,
          started_at: row.started_at,
          metadata: parseJobMetadata(row.metadata),
        }
      : null;
  }

  /**
   * Retrieves the timestamp of the last job run for the specified job name.
   * @param jobName - The name of the job to retrieve the last run timestamp for.
   * @returns The timestamp of the last job run, or null if no job data is found.
   */
  async getLastJobRunTimestamp(jobName: EmailAnalyticsJobName): Promise<Date | null> {
    const jobData = await this.getJobData(jobName);
    return jobData ? jobData.finished_at || jobData.started_at : null;
  }

  /**
   * Sets the timestamp of the last seen event for the specified email analytics events.
   * @param jobName - The name of the job to update.
   * @param field - The field to update.
   * @param date - The timestamp of the last seen event.
   * @description
   * Updates the `finished_at` or `started_at` column of the specified job in the `jobs` table with the provided timestamp.
   * This is used to keep track of the last time the job was run to avoid expensive queries following reboot.
   */
  async setJobTimestamp(
    jobName: EmailAnalyticsJobName,
    field: 'finished' | 'started',
    date: Date,
  ): Promise<void> {
    // Convert string dates to Date objects for SQLite compatibility
    try {
      debug(`Setting ${field} timestamp for job ${jobName} to ${date}`);
      const updateField = field === 'finished' ? 'finished_at' : 'started_at';
      const status = field === 'finished' ? 'finished' : 'started';
      const result = await this.#knex('jobs')
        .update({ [updateField]: date, updated_at: new Date(), status: status })
        .where('name', jobName);
      if (result === 0) {
        await this.#knex('jobs').insert({
          id: new ObjectID().toHexString(),
          name: jobName,
          [updateField]: date.toISOString(), // force to iso string for sqlite
          created_at: date.toISOString(), // force to iso string for sqlite
          updated_at: date.toISOString(), // force to iso string for sqlite
          status: status,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      debug(`Error setting ${field} timestamp for job ${jobName}: ${message}`);
    }
  }

  /**
   * Retrieves and parses the metadata JSON for the specified job.
   * @param jobName - The name of the job.
   * @returns The parsed metadata object, or null.
   */
  async getJobMetadata(jobName: EmailAnalyticsJobName): Promise<JobMetadata | null> {
    const row = await this.#knex('jobs').select('metadata').where('name', jobName).first();
    return row ? parseJobMetadata(row.metadata) : null;
  }

  /**
   * Writes metadata JSON for the specified job.
   * @param jobName - The name of the job.
   * @param metadata - The metadata to store, or null to clear.
   */
  async setJobMetadata(
    jobName: EmailAnalyticsJobName,
    metadata: JobMetadata | null,
  ): Promise<void> {
    try {
      const value = metadata ? JSON.stringify(metadata) : null;
      await this.#knex.transaction(async (trx: Knex.Transaction) => {
        const result = await trx('jobs')
          .update({ metadata: value, updated_at: new Date() })
          .where('name', jobName);
        if (result === 0 && metadata) {
          await trx('jobs').insert({
            id: new ObjectID().toHexString(),
            name: jobName,
            metadata: value,
            created_at: new Date(),
            status: 'queued',
          });
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logging.error(`Error setting metadata for job ${jobName}: ${message}`);
    }
  }

  /**
   * Sets the status of the specified email analytics job.
   * @param jobName - The name of the job to update.
   * @param status - The new status of the job.
   * @description
   * Updates the `status` column of the specified job in the `jobs` table with the provided status.
   * This is used to keep track of the current state of the job.
   */
  async setJobStatus(
    jobName: EmailAnalyticsJobName,
    status: 'started' | 'finished' | 'failed',
  ): Promise<void> {
    debug(`Setting status for job ${jobName} to ${status}`);
    try {
      const result = await this.#knex('jobs')
        .update({
          status: status,
          updated_at: new Date(),
        })
        .where('name', jobName);

      if (result === 0) {
        await this.#knex('jobs').insert({
          id: new ObjectID().toHexString(),
          name: jobName,
          status: status,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      debug(`Error setting status for job ${jobName}: ${message}`);
      throw err;
    }
  }

  async aggregateEmailStats(emailId: string, updateOpenedCount: boolean): Promise<void> {
    const [deliveredCount] = await this.#knex('email_recipients')
      .count('id as count')
      .whereRaw('email_id = ? AND delivered_at IS NOT NULL', [emailId]);
    const [failedCount] = await this.#knex('email_recipients')
      .count('id as count')
      .whereRaw('email_id = ? AND failed_at IS NOT NULL', [emailId]);

    const updateData: Record<string, string | number> = {
      delivered_count: deliveredCount.count,
      failed_count: failedCount.count,
    };

    if (updateOpenedCount) {
      const [openedCount] = await this.#knex('email_recipients')
        .count('id as count')
        .whereRaw('email_id = ? AND opened_at IS NOT NULL', [emailId]);
      updateData.opened_count = openedCount.count;
    }

    await this.#knex('emails').update(updateData).where('id', emailId);
  }

  async aggregateMemberStats(memberId: string): Promise<void> {
    const { trackedEmailCount } =
      (await this.#knex('email_recipients')
        .select(this.#knex.raw('COUNT(email_recipients.id) as trackedEmailCount'))
        .leftJoin('emails', 'email_recipients.email_id', 'emails.id')
        .where('email_recipients.member_id', memberId)
        .where('emails.track_opens', true)
        .first()) || {};
    const emailCountResult = await this.#knex('email_recipients')
      .count('id as count')
      .whereRaw('member_id = ?', [memberId])
      .first();
    const emailOpenedCountResult = await this.#knex('email_recipients')
      .count('id as count')
      .whereRaw('member_id = ? AND opened_at IS NOT NULL', [memberId])
      .first();
    const emailCount = Number(emailCountResult?.count || 0);
    const emailOpenedCount = Number(emailOpenedCountResult?.count || 0);

    const updateQuery: Record<string, string | number> = {
      email_count: emailCount,
      email_opened_count: emailOpenedCount,
    };

    if (trackedEmailCount >= MIN_EMAIL_COUNT_FOR_OPEN_RATE) {
      updateQuery.email_open_rate = Math.round((emailOpenedCount / trackedEmailCount) * 100);
    }

    await this.#knex('members').update(updateQuery).where('id', memberId);
  }

  async aggregateMemberStatsBatch(memberIds: string[]): Promise<void> {
    if (!memberIds || memberIds.length === 0) {
      return;
    }

    // Batch query to get stats for all members at once
    const stats = await this.#knex('email_recipients')
      .leftJoin('emails', 'emails.id', 'email_recipients.email_id')
      .select(
        'email_recipients.member_id',
        this.#knex.raw('COUNT(email_recipients.id) as email_count'),
        this.#knex.raw(
          'SUM(CASE WHEN email_recipients.opened_at IS NOT NULL THEN 1 ELSE 0 END) as email_opened_count',
        ),
        this.#knex.raw('SUM(CASE WHEN emails.track_opens = 1 THEN 1 ELSE 0 END) as tracked_count'),
      )
      .whereIn('email_recipients.member_id', memberIds)
      .groupBy('email_recipients.member_id');

    // Build update data for each member
    const memberStatsMap = new Map<
      string,
      { email_count: number; email_opened_count: number; email_open_rate: number | null }
    >();
    for (const stat of stats) {
      const emailOpenRate =
        stat.tracked_count >= MIN_EMAIL_COUNT_FOR_OPEN_RATE
          ? Math.round((stat.email_opened_count / stat.tracked_count) * 100)
          : null;

      memberStatsMap.set(stat.member_id, {
        email_count: stat.email_count,
        email_opened_count: stat.email_opened_count,
        email_open_rate: emailOpenRate,
      });
    }

    // Build CASE statements for batch update
    const emailCountCases: string[] = [];
    const emailOpenedCountCases: string[] = [];
    const emailOpenRateCases: string[] = [];
    const emailCountBindings: (string | number)[] = [];
    const emailOpenedCountBindings: (string | number)[] = [];
    const emailOpenRateBindings: (string | number)[] = [];

    for (const memberId of memberIds) {
      const memberStats = memberStatsMap.get(memberId) || {
        email_count: 0,
        email_opened_count: 0,
        email_open_rate: null,
      };

      emailCountCases.push(`WHEN ? THEN ?`);
      emailCountBindings.push(memberId, memberStats.email_count);

      emailOpenedCountCases.push(`WHEN ? THEN ?`);
      emailOpenedCountBindings.push(memberId, memberStats.email_opened_count);

      if (memberStats.email_open_rate !== null) {
        emailOpenRateCases.push(`WHEN ? THEN ?`);
        emailOpenRateBindings.push(memberId, memberStats.email_open_rate);
      } else {
        emailOpenRateCases.push(`WHEN ? THEN NULL`);
        emailOpenRateBindings.push(memberId);
      }
    }

    // Combine bindings in the order they appear in the SQL statement:
    // 1. All bindings for email_count CASE statement
    // 2. All bindings for email_opened_count CASE statement
    // 3. All bindings for email_open_rate CASE statement
    // 4. Member IDs for the WHERE IN clause
    const bindings = [
      ...emailCountBindings,
      ...emailOpenedCountBindings,
      ...emailOpenRateBindings,
      ...memberIds,
    ];

    // Execute batched update with CASE statements
    await this.#knex.raw(
      `
            UPDATE members
            SET
                email_count = CASE id ${emailCountCases.join(' ')} END,
                email_opened_count = CASE id ${emailOpenedCountCases.join(' ')} END,
                email_open_rate = CASE id ${emailOpenRateCases.join(' ')} END
            WHERE id IN (${memberIds.map(() => '?').join(',')})
        `,
      bindings,
    );
  }
}
