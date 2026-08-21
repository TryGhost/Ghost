import {fromDatabaseDate} from '../../lib/db-date';
import type {AutomationBrowseStats, TinybirdAutomationSyncBatch} from './types';

const errors = require('@tryghost/errors');

const MAX_ROWS_PER_REQUEST = 1000;

type TinybirdClientOptions = {
    endpoint: string;
    token: string;
    siteUuid: string;
    fetchImpl?: typeof fetch;
};

type TinybirdStatsRow = {
    automation_id: string;
    last_run_created_at: string | null;
    total_run_count: number | string;
    in_progress_run_count: number | string;
};

export class TinybirdAutomationAnalyticsClient {
    readonly #endpoint: string;
    readonly #token: string;
    readonly #siteUuid: string;
    readonly #fetch: typeof fetch;

    constructor({endpoint, token, siteUuid, fetchImpl = fetch}: TinybirdClientOptions) {
        this.#endpoint = endpoint.replace(/\/$/, '');
        this.#token = token;
        this.#siteUuid = siteUuid;
        this.#fetch = fetchImpl;
    }

    async ingest(batch: TinybirdAutomationSyncBatch): Promise<void> {
        await this.#ingestRows('automation_runs', batch.runs);
        await this.#ingestRows('automation_run_steps', batch.steps);
    }

    async fetchStats(): Promise<Map<string, AutomationBrowseStats>> {
        const url = new URL(`${this.#endpoint}/v0/pipes/api_automation_stats.json`);
        url.searchParams.set('site_uuid', this.#siteUuid);

        const response = await this.#fetch(url, {
            headers: {
                Authorization: `Bearer ${this.#token}`
            }
        });
        if (!response.ok) {
            throw new errors.InternalServerError({
                message: `Tinybird automation stats query failed with status ${response.status}: ${await response.text()}`
            });
        }

        const body = await response.json() as {data?: TinybirdStatsRow[]};
        const stats = new Map<string, AutomationBrowseStats>();
        for (const row of body.data ?? []) {
            stats.set(row.automation_id, {
                last_run_created_at: row.last_run_created_at ? fromDatabaseDate(row.last_run_created_at) : null,
                total_run_count: Number(row.total_run_count),
                in_progress_run_count: Number(row.in_progress_run_count)
            });
        }
        return stats;
    }

    async #ingestRows(datasource: string, rows: object[]): Promise<void> {
        for (let offset = 0; offset < rows.length; offset += MAX_ROWS_PER_REQUEST) {
            const chunk = rows.slice(offset, offset + MAX_ROWS_PER_REQUEST);
            const url = new URL(`${this.#endpoint}/v0/events`);
            url.searchParams.set('name', datasource);
            url.searchParams.set('wait', 'true');

            const response = await this.#fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.#token}`,
                    'Content-Type': 'application/x-ndjson'
                },
                body: chunk.map(row => JSON.stringify(row)).join('\n')
            });
            if (!response.ok) {
                throw new errors.InternalServerError({
                    message: `Tinybird ${datasource} ingestion failed with status ${response.status}: ${await response.text()}`
                });
            }
        }
    }
}
