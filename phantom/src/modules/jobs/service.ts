import {randomUUID} from 'node:crypto';
import type {
    JobDefinitionCreateRequest,
    JobDefinitionCreateResponse,
    JobDefinitionListResponse,
    JobEnqueueRequest,
    JobEnqueueResponse,
    JobRunListResponse,
    JobRunResponse
} from './contracts.js';
import type {JobDefinitionRecord, JobRunRecord} from './db.js';
import type {JobsRepository} from './repo.js';
import type {JobQueuePolicy, QueueProvider} from './queue.js';
import type {MetricsClient} from '../../platform/metrics/client.js';
import {HttpError} from '../../platform/http/errors.js';

const defaultPolicies: Record<string, JobQueuePolicy> = {
    email: {queue: 'email', maxAttempts: 5, backoffMs: 10000},
    analytics: {queue: 'analytics', maxAttempts: 3, backoffMs: 15000},
    imports: {queue: 'imports', maxAttempts: 2, backoffMs: 30000},
    outbox: {queue: 'outbox', maxAttempts: 5, backoffMs: 5000}
};

const toDefinitionResponse = (record: JobDefinitionRecord) => {
    return {
        id: record.id,
        name: record.name,
        queue: record.queue,
        schedule: record.schedule ?? null,
        payload: JSON.parse(record.payload) as Record<string, unknown>,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
    };
};

const toRunResponse = (record: JobRunRecord): JobRunResponse => {
    return {
        id: record.id,
        definitionId: record.definitionId ?? null,
        name: record.name,
        queue: record.queue,
        status: record.status === 'completed'
            ? 'completed'
            : record.status === 'failed'
                ? 'failed'
                : record.status === 'running'
                    ? 'running'
                    : 'queued',
        payload: JSON.parse(record.payload) as Record<string, unknown>,
        queuedAt: record.queuedAt,
        startedAt: record.startedAt ?? null,
        finishedAt: record.finishedAt ?? null,
        attempt: record.attempt,
        maxAttempts: record.maxAttempts,
        backoffMs: record.backoffMs,
        error: record.error ?? null
    };
};

export type JobsService = {
    listDefinitions: () => Promise<JobDefinitionListResponse>;
    createDefinition: (input: JobDefinitionCreateRequest) => Promise<JobDefinitionCreateResponse>;
    listRuns: () => Promise<JobRunListResponse>;
    getRun: (id: string) => Promise<{run: JobRunResponse}>;
    enqueueJob: (input: JobEnqueueRequest) => Promise<JobEnqueueResponse>;
};

export const createJobsService = (
    repository: JobsRepository,
    queueProvider: QueueProvider,
    metricsClient?: MetricsClient
): JobsService => {
    const listDefinitions = async () => {
        const definitions = await repository.listDefinitions();
        return {definitions: definitions.map(toDefinitionResponse)};
    };

    const createDefinition = async (input: JobDefinitionCreateRequest) => {
        const now = Date.now();
        const definition = await repository.createDefinition({
            id: randomUUID(),
            name: input.name,
            queue: input.queue,
            schedule: input.schedule ?? null,
            payload: JSON.stringify(input.payload ?? {}),
            createdAt: now,
            updatedAt: now
        });
        return {definition: toDefinitionResponse(definition)};
    };

    const listRuns = async () => {
        const runs = await repository.listRuns();
        const queueStats = await queueProvider.getStats();
        const totalDepth = Object.values(queueStats.queues).reduce((total, queue) => total + queue.depth, 0);
        metricsClient?.setGauge('phantom_queue_depth', totalDepth);
        return {
            runs: runs.map(toRunResponse).sort((left, right) => right.queuedAt - left.queuedAt),
            queueStats
        };
    };

    const getRun = async (id: string) => {
        const run = await repository.getRunById(id);
        if (!run) {
            throw new HttpError(404, 'job_run_not_found', 'Job run not found');
        }
        return {run: toRunResponse(run)};
    };

    const enqueueJob = async (input: JobEnqueueRequest) => {
        if (!input.idempotencyKey) {
            throw new HttpError(422, 'missing_idempotency', 'Idempotency key is required');
        }

        const existing = await repository.getIdempotencyByKey(input.idempotencyKey);
        if (existing) {
            const run = await repository.getRunById(existing.id);
            if (run) {
                return {run: toRunResponse(run)};
            }
        }

        const policy = defaultPolicies[input.queue] ?? {
            queue: input.queue,
            maxAttempts: 3,
            backoffMs: 10000
        };

        const now = Date.now();
        const runId = randomUUID();
        const run = await repository.createRun({
            id: runId,
            definitionId: input.definitionId ?? null,
            name: input.name,
            queue: policy.queue,
            status: 'queued',
            payload: JSON.stringify(input.payload ?? {}),
            queuedAt: now,
            startedAt: null,
            finishedAt: null,
            attempt: 0,
            maxAttempts: policy.maxAttempts,
            backoffMs: policy.backoffMs,
            error: null
        });

        await repository.createIdempotency({
            id: runId,
            key: input.idempotencyKey,
            name: input.name,
            payload: JSON.stringify(input.payload ?? {}),
            createdAt: now
        });

        metricsClient?.increment('phantom_jobs_enqueued_total');

        await queueProvider.enqueue({
            id: runId,
            name: input.name,
            queue: policy.queue,
            payload: input.payload ?? {},
            scheduledAt: null
        });

        return {run: toRunResponse(run)};
    };

    return {
        listDefinitions,
        createDefinition,
        listRuns,
        getRun,
        enqueueJob
    };
};
