import errors from '@tryghost/errors';
import fastq from 'fastq';
import type {queueAsPromised} from 'fastq';
import {JobsBackendBase} from '@tryghost/adapter-base-jobs';
import type {
    JobProcessor,
    JobEnvelope,
    JobsStartOptions,
    RecurringSchedule,
    JobsShutdownOptions
} from '@tryghost/adapter-base-jobs';

const later = require('@breejs/later');
const logging = require('@tryghost/logging');

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;
const DEFAULT_CONCURRENCY = 3;

function hasSeconds(cron: string): boolean {
    return cron.trim().split(/\s+/).length >= 6;
}

function resolveConcurrency(value: unknown): number {
    if (value === undefined || value === null) {
        return DEFAULT_CONCURRENCY;
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        throw new errors.IncorrectUsageError({
            message: `Invalid jobs backend concurrency: ${JSON.stringify(value)}. Expected a positive integer.`
        });
    }
    return value;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

interface RecurringTimer {
    clear(): void;
}

export default class InMemoryJobsBackend extends JobsBackendBase {
    private _processor: JobProcessor | null;
    private _stopped: boolean;
    private _concurrency: number;
    private _queue: queueAsPromised<JobEnvelope>;
    private _recurring: Map<string, RecurringTimer>;

    constructor(config: {concurrency?: unknown} = {}) {
        super();
        this._processor = null;
        this._stopped = false;
        this._concurrency = resolveConcurrency(config.concurrency);
        this._queue = this._createQueue();
        this._recurring = new Map();
    }

    private _createQueue(): queueAsPromised<JobEnvelope> {
        const queue = fastq.promise((envelope: JobEnvelope) => this._deliver(envelope), this._concurrency);
        // Paused until start() attaches a processor; enqueue buffers meanwhile.
        queue.pause();
        return queue;
    }

    start({processor}: JobsStartOptions): void {
        this._processor = processor;
        this._stopped = false;
        this._queue.resume();
    }

    enqueue(envelope: JobEnvelope): void {
        if (this._stopped) {
            return;
        }
        this._queue.push(envelope);
    }

    private async _deliver(envelope: JobEnvelope): Promise<void> {
        const processor = this._processor;
        if (!processor) {
            throw new errors.IncorrectUsageError({
                message: 'InMemoryJobsBackend attempted a delivery with no processor attached - the backend lifecycle is broken.'
            });
        }
        try {
            await processor(envelope);
        } catch (err) {
            logging.error(`Job "${envelope.type}" delivery failed`, err);
        }
    }

    scheduleRecurring(envelope: JobEnvelope, {cron}: RecurringSchedule): void {
        // First schedule per type wins; a re-registration must not disturb a
        // schedule that is already running (parity with a durable backend).
        if (this._stopped || this._recurring.has(envelope.type)) {
            return;
        }

        const parsed = later.parse.cron(cron, hasSeconds(cron));
        const timer = later.setInterval(() => {
            this.enqueue(envelope);
        }, parsed);
        this._recurring.set(envelope.type, timer);
    }

    private _clearRecurring(type: string): void {
        const timer = this._recurring.get(type);
        if (timer) {
            timer.clear();
            this._recurring.delete(type);
        }
    }

    async shutdown(options: JobsShutdownOptions = {}): Promise<void> {
        const timeoutMs = options.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
        this._stopped = true;

        for (const type of [...this._recurring.keys()]) {
            this._clearRecurring(type);
        }

        const queue = this._queue;
        queue.kill();
        if (!queue.idle()) {
            await Promise.race([queue.drained(), delay(timeoutMs)]);
        }

        // Fresh (paused) queue so a re-boot never inherits this lifecycle's
        // abandoned in-flight deliveries against its concurrency limit.
        this._queue = this._createQueue();
        this._processor = null;
    }
}
