import assert from 'node:assert/strict';
import createKnex, {type Knex} from 'knex';
import {AutomationAnalyticsService} from '../../../../../core/server/services/automation-analytics/service';
import {toDatabaseDate} from '../../../../../core/server/lib/db-date';

const SITE_UUID = '00000000-0000-4000-8000-000000000001';

async function createDatabase(): Promise<Knex> {
    const knex = createKnex({
        client: 'better-sqlite3',
        connection: {filename: ':memory:'},
        useNullAsDefault: true
    });
    await knex.schema.createTable('automation_analytics_outbox', (table) => {
        table.text('id').primary();
        table.text('payload').notNullable();
        table.text('created_at').notNullable();
        table.text('available_at').notNullable();
        table.text('locked_at');
        table.text('locked_by');
        table.index(['available_at', 'locked_at', 'created_at']);
    });
    return knex;
}

function config(tinybird?: object) {
    return {
        get(key: string) {
            return key === 'tinybird' ? tinybird : undefined;
        }
    };
}

function logging() {
    return {
        errors: [] as unknown[],
        error(error: unknown) {
            this.errors.push(error);
        }
    };
}

async function waitFor(condition: () => boolean | Promise<boolean>, description: string): Promise<void> {
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
        if (await condition()) {
            return;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 10);
        });
    }
    throw new Error(`Timed out waiting for ${description}`);
}

describe('AutomationAnalyticsService', function () {
    let knex: Knex;

    beforeEach(async function () {
        knex = await createDatabase();
    });

    afterEach(async function () {
        await knex.destroy();
    });

    it('always stores sanitized transaction batches, even without Tinybird config', async function () {
        const service = new AutomationAnalyticsService({
            knex,
            siteUuid: SITE_UUID,
            config: config(),
            logging: logging()
        });
        const now = toDatabaseDate(new Date('2026-08-20T10:00:00.000Z'));

        await knex.transaction(async (trx) => {
            await service.enqueue(trx, {
                runs: [{id: 'run-1', automation_id: 'automation-1', created_at: now, updated_at: now}],
                steps: [{
                    id: 'step-1',
                    automation_run_id: 'run-1',
                    automation_action_revision_id: 'revision-1',
                    created_at: now,
                    updated_at: now,
                    ready_at: now,
                    started_at: null,
                    finished_at: null,
                    status: 'pending',
                    step_attempts: 0
                }]
            });
        });

        const row = await knex('automation_analytics_outbox').first();
        const payload = JSON.parse(row.payload);
        assert.equal(service.isConfigured(), false);
        assert.equal(payload.runs[0].site_uuid, SITE_UUID);
        assert.equal(payload.runs[0].version, 1);
        assert.equal(payload.steps[0].version, 1);
        assert.equal(payload.runs[0].member_id, undefined);
        assert.equal(payload.runs[0].member_email, undefined);
    });

    it('publishes each datasource with acknowledgement and deletes successful batches', async function () {
        const requests: Array<{url: URL, body: string}> = [];
        const fetchImpl = async (input: URL | RequestInfo, init?: RequestInit) => {
            requests.push({url: new URL(input.toString()), body: String(init?.body ?? '')});
            return new Response('{}', {status: 202});
        };
        const service = new AutomationAnalyticsService({
            knex,
            siteUuid: SITE_UUID,
            config: config({endpoint: 'https://tinybird.example', adminToken: 'admin-token'}),
            logging: logging(),
            fetchImpl
        });
        const now = toDatabaseDate(new Date('2026-08-20T10:00:00.000Z'));
        await knex.transaction(async (trx) => {
            await service.enqueue(trx, {
                runs: [{id: 'run-1', automation_id: 'automation-1', created_at: now, updated_at: now}],
                steps: [{
                    id: 'step-1',
                    automation_run_id: 'run-1',
                    automation_action_revision_id: 'revision-1',
                    created_at: now,
                    updated_at: now,
                    ready_at: now,
                    started_at: now,
                    finished_at: now,
                    status: 'finished',
                    step_attempts: 1
                }]
            });
        });

        service.start();
        await waitFor(async () => Number((await knex('automation_analytics_outbox').count({count: '*'}).first())?.count) === 0, 'outbox delivery');
        await service.stop();

        assert.deepEqual(requests.map(request => request.url.searchParams.get('name')), ['automation_runs', 'automation_run_steps']);
        assert(requests.every(request => request.url.searchParams.get('wait') === 'true'));
        assert.equal(JSON.parse(requests[1].body).version, 2);
    });

    it('leaves failed batches available for retry', async function () {
        const logger = logging();
        const service = new AutomationAnalyticsService({
            knex,
            siteUuid: SITE_UUID,
            config: config({endpoint: 'https://tinybird.example', adminToken: 'admin-token'}),
            logging: logger,
            fetchImpl: async () => new Response('unavailable', {status: 503})
        });
        const now = toDatabaseDate(new Date());
        await knex.transaction(async (trx) => {
            await service.enqueue(trx, {
                runs: [{id: 'run-1', automation_id: 'automation-1', created_at: now, updated_at: now}],
                steps: []
            });
        });

        service.start();
        await waitFor(() => logger.errors.length === 1, 'failed delivery');
        await service.stop();

        const row = await knex('automation_analytics_outbox').first();
        assert(row);
        assert.equal(row.locked_at, null);
        assert.equal(row.locked_by, null);
        assert(fromDatabaseDateForTest(row.available_at) > new Date());
    });

    it('fetches browse stats from Tinybird', async function () {
        const service = new AutomationAnalyticsService({
            knex,
            siteUuid: SITE_UUID,
            config: config({endpoint: 'https://tinybird.example/', adminToken: 'admin-token'}),
            logging: logging(),
            fetchImpl: async input => new Response(JSON.stringify({
                data: [{
                    automation_id: 'automation-1',
                    last_run_created_at: '2026-08-20 10:00:00',
                    total_run_count: '12',
                    in_progress_run_count: 3
                }]
            }), {status: 200, headers: {'Content-Type': 'application/json'}})
        });

        const stats = await service.fetchStats();

        assert.deepEqual(stats.get('automation-1'), {
            last_run_created_at: new Date('2026-08-20T10:00:00.000Z'),
            total_run_count: 12,
            in_progress_run_count: 3
        });
    });

    it('uses existing Tinybird Local stats config', async function () {
        let requestedUrl: URL | undefined;
        const service = new AutomationAnalyticsService({
            knex,
            siteUuid: SITE_UUID,
            config: config({
                stats: {
                    id: 'configured-site',
                    local: {
                        enabled: true,
                        endpoint: 'http://tinybird-local:7181',
                        token: 'local-token'
                    }
                }
            }),
            logging: logging(),
            fetchImpl: async (input) => {
                requestedUrl = new URL(input.toString());
                return new Response('{"data": []}', {status: 200});
            }
        });

        await service.fetchStats();

        assert.equal(service.isConfigured(), true);
        assert.equal(requestedUrl?.origin, 'http://tinybird-local:7181');
        assert.equal(requestedUrl?.searchParams.get('site_uuid'), 'configured-site');
    });
});

function fromDatabaseDateForTest(value: string): Date {
    return new Date(`${value.replace(' ', 'T')}Z`);
}
