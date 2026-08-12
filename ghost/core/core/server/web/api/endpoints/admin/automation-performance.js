const ObjectId = require('bson-objectid').default;
const db = require('../../../../data/db');

const AUTOMATION_STEP_COUNT = 10;
const AUTOMATION_RUN_COUNT = 10000;
// Each run has 10 steps. Keep step inserts below SQLite's 500-term compound SELECT limit.
const INSERT_CHUNK_SIZE = 50;

function createPage() {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Automation performance</title>
</head>
<body>
    <button id="setup" type="button">setup</button>
    <button id="query" type="button">query</button>
    <textarea id="result" rows="12" cols="80" readonly></textarea>
    <script>
        const result = document.getElementById('result');

        async function run(path) {
            result.value = 'Running...';
            const response = await fetch(window.location.pathname + path, {method: 'POST'});
            result.value = JSON.stringify(await response.json(), null, 2);
        }

        document.getElementById('setup').addEventListener('click', () => run('/setup'));
        document.getElementById('query').addEventListener('click', () => run('/query'));
    </script>
</body>
</html>`;
}

function buildRows(automationId, actionRevisions, now) {
    const runs = [];
    const runSteps = [];

    for (let index = 0; index < AUTOMATION_RUN_COUNT; index += 1) {
        const runId = ObjectId().toHexString();
        runs.push({
            id: runId,
            created_at: now,
            updated_at: now,
            automation_id: automationId,
            member_id: null,
            member_email: `automation-performance-${index}@example.com`
        });

        for (const actionRevisionId of actionRevisions) {
            runSteps.push({
                id: ObjectId().toHexString(),
                created_at: now,
                updated_at: now,
                automation_run_id: runId,
                automation_action_revision_id: actionRevisionId,
                ready_at: now,
                step_attempts: 1,
                started_at: now,
                finished_at: now,
                status: 'finished',
                locked_by: null,
                locked_at: null
            });
        }
    }

    return {runs, runSteps};
}

async function setup() {
    const now = new Date();
    const automationId = ObjectId().toHexString();
    const actionIds = Array.from({length: AUTOMATION_STEP_COUNT}, () => ObjectId().toHexString());
    const actionRevisionIds = Array.from({length: AUTOMATION_STEP_COUNT}, () => ObjectId().toHexString());
    const {runs, runSteps} = buildRows(automationId, actionRevisionIds, now);

    await db.knex.transaction(async (trx) => {
        await trx('automations').insert({
            id: automationId,
            status: 'inactive',
            name: `Automation performance ${automationId}`,
            slug: `automation-performance-${automationId}`,
            created_at: now,
            updated_at: now
        });
        await trx('automation_actions').insert(actionIds.map(id => ({
            id,
            created_at: now,
            updated_at: now,
            deleted_at: null,
            automation_id: automationId,
            type: 'wait'
        })));
        await trx('automation_action_revisions').insert(actionRevisionIds.map((id, index) => ({
            id,
            created_at: now,
            action_id: actionIds[index],
            wait_hours: 1,
            email_subject: null,
            email_lexical: null,
            email_design_setting_id: null,
            email_sent_count: null,
            email_opened_count: null,
            email_clicked_count: null
        })));
        await trx('automation_action_edges').insert(actionIds.slice(1).map((targetActionId, index) => ({
            source_action_id: actionIds[index],
            target_action_id: targetActionId
        })));

        for (let index = 0; index < runs.length; index += INSERT_CHUNK_SIZE) {
            await trx('automation_runs').insert(runs.slice(index, index + INSERT_CHUNK_SIZE));
            await trx('automation_run_steps').insert(runSteps.slice(index * AUTOMATION_STEP_COUNT, (index + INSERT_CHUNK_SIZE) * AUTOMATION_STEP_COUNT));
        }
    });

    return {
        automation_id: automationId,
        automation_runs: AUTOMATION_RUN_COUNT,
        automation_run_steps: AUTOMATION_RUN_COUNT * AUTOMATION_STEP_COUNT
    };
}

async function query() {
    const queryResult = await db.knex.raw(`
        SELECT
            COALESCE(SUM(CASE WHEN has_pending THEN 1 ELSE 0 END), 0) AS pendingCount,
            COALESCE(SUM(CASE WHEN NOT has_pending AND has_member_changed_status THEN 1 ELSE 0 END), 0) AS memberChangedStatusCount,
            COALESCE(SUM(CASE WHEN NOT has_pending AND NOT has_member_changed_status AND has_failed THEN 1 ELSE 0 END), 0) AS failedCount,
            COALESCE(SUM(CASE WHEN NOT has_pending AND NOT has_member_changed_status AND NOT has_failed THEN 1 ELSE 0 END), 0) AS finishedCount
        FROM (
            SELECT
                automation_runs.id,
                MAX(automation_run_steps.status = 'pending') AS has_pending,
                MAX(automation_run_steps.status = 'member changed status') AS has_member_changed_status,
                MAX(automation_run_steps.status = 'failed') AS has_failed
            FROM automation_runs
            LEFT JOIN automation_run_steps ON automation_run_steps.automation_run_id = automation_runs.id
            GROUP BY automation_runs.id
        ) AS run_statuses
    `);
    const rows = Array.isArray(queryResult[0]) ? queryResult[0] : queryResult;

    return Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]));
}

module.exports = {
    page(req, res) {
        res.type('html').send(createPage());
    },
    async setup(req, res, next) {
        try {
            res.json(await setup());
        } catch (error) {
            next(error);
        }
    },
    async query(req, res, next) {
        try {
            res.json(await query());
        } catch (error) {
            next(error);
        }
    }
};
