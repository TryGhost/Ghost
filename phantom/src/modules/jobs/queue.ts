export type JobQueuePolicy = {
    queue: string;
    maxAttempts: number;
    backoffMs: number;
};

export type QueueJob = {
    id: string;
    name: string;
    queue: string;
    payload: Record<string, unknown>;
    scheduledAt?: number | null;
};

export type QueueProvider = {
    enqueue: (job: QueueJob) => Promise<void>;
    getStats: () => Promise<{
        queues: Record<string, {depth: number; delayed: number; running: number}>;
        workerHealthy: boolean;
        updatedAt: number;
    }>;
};

export const createInMemoryQueueProvider = (): QueueProvider => {
    const pending: QueueJob[] = [];

    const enqueue = async (job: QueueJob) => {
        pending.push(job);
    };

    const getStats = async () => {
        const queues: Record<string, {depth: number; delayed: number; running: number}> = {};
        for (const job of pending) {
            const entry = queues[job.queue] ?? {depth: 0, delayed: 0, running: 0};
            entry.depth += 1;
            if (job.scheduledAt && job.scheduledAt > Date.now()) {
                entry.delayed += 1;
            }
            queues[job.queue] = entry;
        }
        return {
            queues,
            workerHealthy: true,
            updatedAt: Date.now()
        };
    };

    return {enqueue, getStats};
};
