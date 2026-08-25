import type {Knex} from 'knex';
import {toDatabaseDate, type DatabaseDate} from '../../lib/db-date';
import {TinybirdAutomationAnalyticsClient, TrafficAnalyticsClient} from './tinybird-client';
import type {
    AutomationAnalytics,
    AutomationBrowseStats,
    AutomationRunSnapshot,
    AutomationRunStepSnapshot,
    TinybirdAutomationRun,
    TinybirdAutomationRunStep
} from './types';

const errors = require('@tryghost/errors');

const SYNC_INTERVAL_MS = 15000;
const SYNC_BATCH_SIZE = 1000;
const FIRST_SYNC_DATE = '1970-01-01 00:00:00' as DatabaseDate;

type Config = {get(key: string): unknown};
type Logging = {error(error: unknown, message?: string): void};
type AutomationAnalyticsServiceOptions = {
    knex: Knex;
    siteUuid: string;
    config: Config;
    logging: Logging;
    fetchImpl?: typeof fetch;
};
type SyncableTable = 'automation_runs' | 'automation_run_steps';
type SyncRow = AutomationRunSnapshot | AutomationRunStepSnapshot;

export class AutomationAnalyticsService implements AutomationAnalytics {
    readonly #knex: Knex;
    readonly #siteUuid: string;
    readonly #logging: Logging;
    readonly #tinybirdClient: TinybirdAutomationAnalyticsClient | null;
    readonly #trafficAnalyticsClient: TrafficAnalyticsClient | null;
    #timer: ReturnType<typeof setTimeout> | null = null;
    #syncPromise: Promise<void> | null = null;
    #stopped = true;

    constructor({knex, siteUuid, config, logging, fetchImpl}: AutomationAnalyticsServiceOptions) {
        this.#knex = knex;
        this.#logging = logging;

        const tinybirdConfig = config.get('tinybird') as Record<string, any> | undefined;
        const statsConfig = tinybirdConfig?.stats;
        const tinybirdEndpoint = tinybirdConfig?.endpoint ?? (
            statsConfig?.local?.enabled ? statsConfig.local.endpoint : statsConfig?.endpoint
        );
        const token = tinybirdConfig?.adminToken ?? (
            statsConfig?.local?.enabled ? statsConfig.local.token : statsConfig?.token
        );
        this.#siteUuid = statsConfig?.id ?? siteUuid;
        this.#tinybirdClient = tinybirdEndpoint && token ? new TinybirdAutomationAnalyticsClient({
            endpoint: tinybirdEndpoint,
            token,
            siteUuid: this.#siteUuid,
            fetchImpl
        }) : null;

        const trafficAnalyticsEndpoint = config.get('analytics:url');
        this.#trafficAnalyticsClient = typeof trafficAnalyticsEndpoint === 'string' && trafficAnalyticsEndpoint ? new TrafficAnalyticsClient({
            endpoint: trafficAnalyticsEndpoint,
            token,
            fetchImpl
        }) : null;
    }

    isConfigured(): boolean {
        return Boolean(this.#tinybirdClient);
    }

    async fetchStats(): Promise<Map<string, AutomationBrowseStats>> {
        if (!this.#tinybirdClient) {
            throw new errors.InternalServerError({message: 'Tinybird automation analytics is not configured'});
        }
        return await this.#tinybirdClient.fetchStats();
    }

    start(): void {
        if (!this.#tinybirdClient || !this.#trafficAnalyticsClient || !this.#stopped) {
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
        await this.#syncPromise;
    }

    async sync(): Promise<void> {
        if (!this.#tinybirdClient || !this.#trafficAnalyticsClient) {
            return;
        }
        const watermarks = await this.#tinybirdClient.fetchSyncWatermarks();
        const cutoff = toDatabaseDate(new Date());
        await this.#syncTable('automation_runs', watermarks.runs_updated_at ?? FIRST_SYNC_DATE, cutoff);
        await this.#syncTable('automation_run_steps', watermarks.steps_updated_at ?? FIRST_SYNC_DATE, cutoff);
    }

    #schedule(delay: number): void {
        if (this.#stopped) {
            return;
        }
        this.#timer = setTimeout(() => {
            this.#timer = null;
            this.#syncPromise = this.sync().catch((error) => {
                this.#logging.error(error, 'Failed to sync automation analytics');
            }).finally(() => {
                this.#syncPromise = null;
                this.#schedule(SYNC_INTERVAL_MS);
            });
        }, delay);
        this.#timer.unref?.();
    }

    async #syncTable(table: SyncableTable, watermark: DatabaseDate, cutoff: DatabaseDate): Promise<void> {
        let lastUpdatedAt: DatabaseDate | null = null;
        let lastId: string | null = null;

        while (true) {
            const query = this.#knex(table)
                .select(this.#columnsFor(table))
                .where('updated_at', '>=', watermark)
                .andWhere('updated_at', '<=', cutoff)
                .orderBy('updated_at')
                .orderBy('id')
                .limit(SYNC_BATCH_SIZE);

            if (lastUpdatedAt && lastId) {
                query.andWhere((builder) => {
                    builder.where('updated_at', '>', lastUpdatedAt)
                        .orWhere((sameTimestamp) => {
                            sameTimestamp.where('updated_at', lastUpdatedAt).andWhere('id', '>', lastId);
                        });
                });
            }

            const rows = await query as SyncRow[];
            if (!rows.length) {
                return;
            }
            const events = table === 'automation_runs' ?
                (rows as AutomationRunSnapshot[]).map(row => this.#buildRun(row)) :
                (rows as AutomationRunStepSnapshot[]).map(row => this.#buildStep(row));
            await this.#trafficAnalyticsClient!.ingest(table, events);

            const lastRow = rows.at(-1)!;
            lastUpdatedAt = lastRow.updated_at;
            lastId = lastRow.id;
        }
    }

    #columnsFor(table: SyncableTable): string[] {
        return table === 'automation_runs' ?
            ['id', 'automation_id', 'created_at', 'updated_at'] :
            ['id', 'automation_run_id', 'automation_action_revision_id', 'created_at', 'updated_at', 'ready_at', 'started_at', 'finished_at', 'status', 'step_attempts'];
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
        const updatedAt = toDatabaseDate(step.updated_at);
        const terminalOffset = step.status === 'pending' ? 0n : 1n;
        const version = (BigInt(new Date(`${updatedAt.replace(' ', 'T')}Z`).getTime()) * 1000n) +
            (BigInt(step.step_attempts) * 2n) + terminalOffset;
        return {
            site_uuid: this.#siteUuid,
            id: step.id,
            automation_run_id: step.automation_run_id,
            automation_action_revision_id: step.automation_action_revision_id,
            created_at: toDatabaseDate(step.created_at),
            updated_at: updatedAt,
            ready_at: toDatabaseDate(step.ready_at),
            started_at: step.started_at === null ? null : toDatabaseDate(step.started_at),
            finished_at: step.finished_at === null ? null : toDatabaseDate(step.finished_at),
            status: step.status,
            step_attempts: step.step_attempts,
            version: version.toString()
        };
    }
}
