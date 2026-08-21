import crypto from 'node:crypto';
import ObjectId from 'bson-objectid';
import type {Knex} from 'knex';
import {toDatabaseDate} from '../../lib/db-date';
import {TinybirdAutomationAnalyticsClient} from './tinybird-client';
import type {
    AutomationAnalytics,
    AutomationAnalyticsSyncBatch,
    AutomationBrowseStats,
    AutomationRunSnapshot,
    AutomationRunStepSnapshot,
    TinybirdAutomationRun,
    TinybirdAutomationRunStep,
    TinybirdAutomationSyncBatch
} from './types';

const errors = require('@tryghost/errors');

const OUTBOX_TABLE = 'automation_analytics_outbox';
const POLL_INTERVAL_MS = 1000;
const RETRY_DELAY_MS = 5000;
const STALE_LOCK_MS = 5 * 60 * 1000;
const CLAIM_LIMIT = 10;

type Config = {
    get(key: string): unknown;
};

type Logging = {
    error(error: unknown, message?: string): void;
};

type OutboxRow = {
    id: string;
    payload: string;
    locked_by: string;
};

type AutomationAnalyticsServiceOptions = {
    knex: Knex;
    siteUuid: string;
    config: Config;
    logging: Logging;
    fetchImpl?: typeof fetch;
};

export class AutomationAnalyticsService implements AutomationAnalytics {
    readonly #knex: Knex;
    readonly #siteUuid: string;
    readonly #logging: Logging;
    readonly #client: TinybirdAutomationAnalyticsClient | null;
    #timer: ReturnType<typeof setTimeout> | null = null;
    #pollPromise: Promise<void> | null = null;
    #stopped = true;

    constructor({knex, siteUuid, config, logging, fetchImpl}: AutomationAnalyticsServiceOptions) {
        this.#knex = knex;
        this.#siteUuid = siteUuid;
        this.#logging = logging;

        const tinybirdConfig = config.get('tinybird') as Record<string, any> | undefined;
        const statsConfig = tinybirdConfig?.stats;
        const endpoint = tinybirdConfig?.endpoint ?? (
            statsConfig?.local?.enabled ? statsConfig.local.endpoint : statsConfig?.endpoint
        );
        const token = tinybirdConfig?.adminToken ?? (
            statsConfig?.local?.enabled ? statsConfig.local.token : statsConfig?.token
        );
        this.#client = endpoint && token ? new TinybirdAutomationAnalyticsClient({
            endpoint,
            token,
            siteUuid: statsConfig?.id ?? siteUuid,
            fetchImpl
        }) : null;
    }

    isConfigured(): boolean {
        return Boolean(this.#client);
    }

    async enqueue(trx: Knex.Transaction, batch: AutomationAnalyticsSyncBatch): Promise<void> {
        if (!batch.runs.length && !batch.steps.length) {
            return;
        }

        const payload: TinybirdAutomationSyncBatch = {
            runs: batch.runs.map(run => this.#buildRun(run)),
            steps: batch.steps.map(step => this.#buildStep(step))
        };
        const now = toDatabaseDate(new Date());
        await trx(OUTBOX_TABLE).insert({
            id: ObjectId().toHexString(),
            payload: JSON.stringify(payload),
            created_at: now,
            available_at: now,
            locked_at: null,
            locked_by: null
        });
    }

    async fetchStats(): Promise<Map<string, AutomationBrowseStats>> {
        if (!this.#client) {
            throw new errors.InternalServerError({message: 'Tinybird automation analytics is not configured'});
        }
        return await this.#client.fetchStats();
    }

    start(): void {
        if (!this.#client || !this.#stopped) {
            return;
        }
        this.#stopped = false;
        this.#schedule(0);
    }

    async stop(): Promise<void> {
        this.#stopped = true;
        if (this.#timer) {
            clearTimeout(this.#timer);
            this.#timer = null;
        }
        await this.#pollPromise;
    }

    #buildRun(run: AutomationRunSnapshot): TinybirdAutomationRun {
        return {
            site_uuid: this.#siteUuid,
            id: run.id,
            automation_id: run.automation_id,
            created_at: toDatabaseDate(run.created_at),
            updated_at: toDatabaseDate(run.updated_at),
            version: 1
        };
    }

    #buildStep(step: AutomationRunStepSnapshot): TinybirdAutomationRunStep {
        return {
            site_uuid: this.#siteUuid,
            id: step.id,
            automation_run_id: step.automation_run_id,
            automation_action_revision_id: step.automation_action_revision_id,
            created_at: toDatabaseDate(step.created_at),
            updated_at: toDatabaseDate(step.updated_at),
            ready_at: toDatabaseDate(step.ready_at),
            started_at: step.started_at === null ? null : toDatabaseDate(step.started_at),
            finished_at: step.finished_at === null ? null : toDatabaseDate(step.finished_at),
            status: step.status,
            step_attempts: step.step_attempts,
            version: step.status === 'pending' ? 1 : 2
        };
    }

    #schedule(delay: number): void {
        if (this.#stopped) {
            return;
        }
        this.#timer = setTimeout(() => {
            this.#timer = null;
            this.#pollPromise = this.#poll().finally(() => {
                this.#pollPromise = null;
                this.#schedule(POLL_INTERVAL_MS);
            });
        }, delay);
        this.#timer.unref?.();
    }

    async #poll(): Promise<void> {
        const now = new Date();
        const staleLockCutoff = new Date(now.getTime() - STALE_LOCK_MS);
        const candidateIds = await this.#knex(OUTBOX_TABLE)
            .select('id')
            .where('available_at', '<=', toDatabaseDate(now))
            .where((builder) => {
                builder.whereNull('locked_at').orWhere('locked_at', '<', toDatabaseDate(staleLockCutoff));
            })
            .orderBy(['available_at', 'created_at', 'id'])
            .limit(CLAIM_LIMIT);

        for (const candidate of candidateIds) {
            if (this.#stopped) {
                return;
            }
            const row = await this.#claim(candidate.id, now, staleLockCutoff);
            if (row) {
                await this.#publish(row);
            }
        }
    }

    async #claim(id: string, now: Date, staleLockCutoff: Date): Promise<OutboxRow | null> {
        const lockId = crypto.randomUUID();
        const changed = await this.#knex(OUTBOX_TABLE)
            .where('id', id)
            .where('available_at', '<=', toDatabaseDate(now))
            .where((builder) => {
                builder.whereNull('locked_at').orWhere('locked_at', '<', toDatabaseDate(staleLockCutoff));
            })
            .update({
                locked_at: toDatabaseDate(now),
                locked_by: lockId
            });
        if (!changed) {
            return null;
        }
        return await this.#knex(OUTBOX_TABLE).where({id, locked_by: lockId}).first() ?? null;
    }

    async #publish(row: OutboxRow): Promise<void> {
        try {
            const batch = JSON.parse(row.payload) as TinybirdAutomationSyncBatch;
            await this.#client?.ingest(batch);
            await this.#knex(OUTBOX_TABLE).where({id: row.id, locked_by: row.locked_by}).del();
        } catch (error) {
            this.#logging.error(error, 'Failed to publish automation analytics batch');
            await this.#knex(OUTBOX_TABLE)
                .where({id: row.id, locked_by: row.locked_by})
                .update({
                    available_at: toDatabaseDate(new Date(Date.now() + RETRY_DELAY_MS)),
                    locked_at: null,
                    locked_by: null
                });
        }
    }
}
