import {fromDatabaseDate, type DatabaseDate} from '../../lib/db-date';
import type {AutomationBrowseStats, AutomationSyncWatermarks} from './types';

const errors = require('@tryghost/errors');

type TinybirdClientOptions = {endpoint: string; token: string; siteUuid: string; fetchImpl?: typeof fetch};
type TrafficAnalyticsClientOptions = {endpoint: string; token: string; fetchImpl?: typeof fetch};
type TinybirdStatsRow = {
    automation_id: string;
    last_run_created_at: string | null;
    total_run_count: number | string;
    in_progress_run_count: number | string;
};
type TinybirdWatermarkRow = {
    runs_updated_at: DatabaseDate | null;
    steps_updated_at: DatabaseDate | null;
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

    async fetchStats(): Promise<Map<string, AutomationBrowseStats>> {
        const body = await this.#getPipe<{data?: TinybirdStatsRow[]}>('api_automation_stats');
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

    async fetchSyncWatermarks(): Promise<AutomationSyncWatermarks> {
        const body = await this.#getPipe<{data?: TinybirdWatermarkRow[]}>('api_automation_sync_watermarks');
        return body.data?.[0] ?? {runs_updated_at: null, steps_updated_at: null};
    }

    async #getPipe<T>(pipe: string): Promise<T> {
        const url = new URL(`${this.#endpoint}/v0/pipes/${pipe}.json`);
        url.searchParams.set('site_uuid', this.#siteUuid);
        const response = await this.#fetch(url, {headers: {Authorization: `Bearer ${this.#token}`}});
        if (!response.ok) {
            throw new errors.InternalServerError({message: `Tinybird ${pipe} query failed with status ${response.status}: ${await response.text()}`});
        }
        return await response.json() as T;
    }
}

export class TrafficAnalyticsClient {
    readonly #endpoint: string;
    readonly #token: string;
    readonly #fetch: typeof fetch;

    constructor({endpoint, token, fetchImpl = fetch}: TrafficAnalyticsClientOptions) {
        this.#endpoint = endpoint.replace(/\/$/, '');
        this.#token = token;
        this.#fetch = fetchImpl;
    }

    async ingest(datasource: string, events: object[]): Promise<void> {
        const response = await this.#fetch(`${this.#endpoint}/api/v1/tinybird`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.#token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({datasource, events})
        });
        if (!response.ok) {
            throw new errors.InternalServerError({message: `Traffic analytics ingestion failed with status ${response.status}: ${await response.text()}`});
        }
    }
}
