#!/usr/bin/env node

const endpoint = (process.env.TINYBIRD_HOST ?? 'http://localhost:7181').replace(/\/$/, '');
const token = process.env.TINYBIRD_ADMIN_TOKEN;
const siteUuid = process.env.SITE_UUID ?? 'automation-benchmark';
const runCount = Number(process.env.RUN_COUNT ?? 1_000_000);
const stepCount = Number(process.env.STEP_COUNT ?? 5_000_000);
const automationCount = Number(process.env.AUTOMATION_COUNT ?? 100);
const batchSize = Number(process.env.BATCH_SIZE ?? 10_000);
const iterations = Number(process.env.ITERATIONS ?? 5);

if (!token) {
    throw new Error('TINYBIRD_ADMIN_TOKEN is required');
}

const postRows = async (datasource, rows) => {
    const url = new URL('/v0/events', endpoint);
    url.searchParams.set('name', datasource);
    url.searchParams.set('wait', 'true');
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-ndjson'
        },
        body: rows.map(row => JSON.stringify(row)).join('\n')
    });
    if (!response.ok) {
        throw new Error(`${datasource} ingestion failed: ${response.status} ${await response.text()}`);
    }
};

const ingest = async (datasource, count, buildRows) => {
    for (let offset = 0; offset < count; offset += batchSize) {
        const size = Math.min(batchSize, count - offset);
        await postRows(datasource, buildRows(offset, size));
        if ((offset + size) % 100_000 === 0 || offset + size === count) {
            process.stdout.write(`\r${datasource}: ${(offset + size).toLocaleString()}/${count.toLocaleString()}`);
        }
    }
    process.stdout.write('\n');
};

const createdAt = '2026-01-01 00:00:00';
const finishedAt = '2026-01-01 00:01:00';

await ingest('automation_runs', runCount, (offset, size) => Array.from({length: size}, (_, index) => {
    const number = offset + index;
    return {
        site_uuid: siteUuid,
        id: `run-${number}`,
        automation_id: `automation-${number % automationCount}`,
        created_at: createdAt,
        updated_at: createdAt,
        version: 1
    };
}));

await ingest('automation_run_steps', stepCount, (offset, size) => Array.from({length: size}, (_, index) => {
    const number = offset + index;
    return {
        site_uuid: siteUuid,
        id: `step-${number}`,
        automation_run_id: `run-${number % runCount}`,
        automation_action_revision_id: `revision-${number % automationCount}`,
        created_at: createdAt,
        updated_at: createdAt,
        ready_at: createdAt,
        started_at: null,
        finished_at: null,
        status: 'pending',
        step_attempts: 0,
        version: 1
    };
}));

await ingest('automation_run_steps', stepCount, (offset, size) => Array.from({length: size}, (_, index) => {
    const number = offset + index;
    return {
        site_uuid: siteUuid,
        id: `step-${number}`,
        automation_run_id: `run-${number % runCount}`,
        automation_action_revision_id: `revision-${number % automationCount}`,
        created_at: createdAt,
        updated_at: finishedAt,
        ready_at: createdAt,
        started_at: null,
        finished_at: finishedAt,
        status: 'finished',
        step_attempts: 0,
        version: 2
    };
}));

const queryUrl = new URL('/v0/pipes/api_automation_stats.json', endpoint);
queryUrl.searchParams.set('site_uuid', siteUuid);

for (let iteration = 1; iteration <= iterations; iteration += 1) {
    const started = performance.now();
    const response = await fetch(queryUrl, {
        headers: {Authorization: `Bearer ${token}`}
    });
    const body = await response.json();
    if (!response.ok) {
        throw new Error(`Query failed: ${response.status} ${JSON.stringify(body)}`);
    }
    console.log(`query ${iteration}: ${Math.round(performance.now() - started)}ms, ${body.data.length} automations`);
}
