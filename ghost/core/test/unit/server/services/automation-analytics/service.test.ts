import assert from 'node:assert/strict';
import createKnex, {type Knex} from 'knex';
import {AutomationAnalyticsService} from '../../../../../core/server/services/automation-analytics/service';
import {toDatabaseDate} from '../../../../../core/server/lib/db-date';

const SITE_UUID = '00000000-0000-4000-8000-000000000001';

async function createDatabase(): Promise<Knex> {
    const knex = createKnex({client: 'better-sqlite3', connection: {filename: ':memory:'}, useNullAsDefault: true});
    await knex.schema.createTable('automation_runs', (table) => {
        table.text('id').primary();
        table.text('automation_id').notNullable();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
    });
    await knex.schema.createTable('automation_run_steps', (table) => {
        table.text('id').primary();
        table.text('automation_run_id').notNullable();
        table.text('automation_action_revision_id').notNullable();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
        table.text('ready_at').notNullable();
        table.text('started_at');
        table.text('finished_at');
        table.text('status').notNullable();
        table.integer('step_attempts').notNullable();
    });
    return knex;
}

function config(tinybird?: object, analyticsUrl?: string) {
    return {
        get(key: string) {
            if (key === 'tinybird') {
                return tinybird;
            }
            return key === 'analytics:url' ? analyticsUrl : undefined;
        }
    };
}

function logging() {
    return {error() {}};
}

describe('AutomationAnalyticsService', function () {
    let knex: Knex;

    beforeEach(async function () {
        knex = await createDatabase();
    });

    afterEach(async function () {
        await knex.destroy();
    });

    it('syncs rows newer than Tinybird watermarks through traffic analytics', async function () {
        const requests: Array<{url: URL; body?: any; authorization?: string}> = [];
        const fetchImpl = async (input: URL | RequestInfo, init?: RequestInit) => {
            const url = new URL(input.toString());
            requests.push({
                url,
                body: init?.body ? JSON.parse(String(init.body)) : undefined,
                authorization: new Headers(init?.headers).get('Authorization') ?? undefined
            });
            if (url.pathname.endsWith('api_automation_sync_watermarks.json')) {
                return new Response(JSON.stringify({data: [{runs_updated_at: '2026-08-20 10:00:00', steps_updated_at: null}]}), {status: 200});
            }
            return new Response('{}', {status: 202});
        };
        const oldDate = toDatabaseDate(new Date('2026-08-20T09:00:00.000Z'));
        const newDate = toDatabaseDate(new Date('2026-08-20T11:00:00.000Z'));
        await knex('automation_runs').insert([
            {id: 'old-run', automation_id: 'automation-1', created_at: oldDate, updated_at: oldDate},
            {id: 'new-run', automation_id: 'automation-1', created_at: newDate, updated_at: newDate}
        ]);
        await knex('automation_run_steps').insert({
            id: 'step-1', automation_run_id: 'new-run', automation_action_revision_id: 'revision-1',
            created_at: newDate, updated_at: newDate, ready_at: newDate, started_at: null,
            finished_at: newDate, status: 'finished', step_attempts: 1
        });
        const service = new AutomationAnalyticsService({
            knex,
            siteUuid: SITE_UUID,
            config: config({endpoint: 'https://tinybird.example', adminToken: 'token'}, 'https://analytics.example'),
            logging: logging(),
            fetchImpl
        });

        await service.sync();

        const ingestion = requests.filter(request => request.url.origin === 'https://analytics.example');
        assert.deepEqual(ingestion.map(request => request.body.datasource), ['automation_runs', 'automation_run_steps']);
        assert(ingestion.every(request => request.authorization === 'Bearer token'));
        assert.deepEqual(ingestion[0].body.events.map((event: any) => event.id), ['new-run']);
        assert.equal(ingestion[1].body.events[0].status, 'finished');
        assert.equal(BigInt(ingestion[1].body.events[0].version) % 2n, 1n);
        assert.equal(ingestion[1].body.events[0].member_email, undefined);
    });

    it('uses 1000-row traffic analytics batches', async function () {
        const now = toDatabaseDate(new Date('2026-08-20T11:00:00.000Z'));
        await knex.batchInsert('automation_runs', Array.from({length: 1001}, (_, index) => ({
            id: String(index).padStart(24, '0'), automation_id: 'automation-1', created_at: now, updated_at: now
        })), 100);
        const batchSizes: number[] = [];
        const service = new AutomationAnalyticsService({
            knex,
            siteUuid: SITE_UUID,
            config: config({endpoint: 'https://tinybird.example', adminToken: 'token'}, 'https://analytics.example'),
            logging: logging(),
            fetchImpl: async (input, init) => {
                const url = new URL(input.toString());
                if (url.pathname.endsWith('api_automation_sync_watermarks.json')) {
                    return new Response('{"data":[{"runs_updated_at":null,"steps_updated_at":null}]}', {status: 200});
                }
                batchSizes.push(JSON.parse(String(init?.body)).events.length);
                return new Response('{}', {status: 202});
            }
        });

        await service.sync();

        assert.deepEqual(batchSizes, [1000, 1]);
    });

    it('does not sync without both Tinybird and traffic analytics config', async function () {
        let requestCount = 0;
        const service = new AutomationAnalyticsService({
            knex,
            siteUuid: SITE_UUID,
            config: config({endpoint: 'https://tinybird.example', adminToken: 'token'}),
            logging: logging(),
            fetchImpl: async () => {
                requestCount += 1;
                return new Response('{}');
            }
        });

        await service.sync();

        assert.equal(service.isConfigured(), true);
        assert.equal(requestCount, 0);
    });

    it('fetches browse stats directly from Tinybird', async function () {
        const service = new AutomationAnalyticsService({
            knex,
            siteUuid: SITE_UUID,
            config: config({endpoint: 'https://tinybird.example/', adminToken: 'token'}),
            logging: logging(),
            fetchImpl: async () => new Response(JSON.stringify({data: [{
                automation_id: 'automation-1', last_run_created_at: '2026-08-20 10:00:00',
                total_run_count: '12', in_progress_run_count: 3
            }]}), {status: 200})
        });

        const stats = await service.fetchStats();

        assert.deepEqual(stats.get('automation-1'), {
            last_run_created_at: new Date('2026-08-20T10:00:00.000Z'),
            total_run_count: 12,
            in_progress_run_count: 3
        });
    });
});
