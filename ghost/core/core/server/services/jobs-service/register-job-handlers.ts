import logging from '@tryghost/logging';
import {getInstance} from './index';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';

export default function registerJobHandlers(): void {
    const jobsService = getInstance();
    const db = require('../../data/db');

    jobsService.handle(CleanTokensJob, async () => {
        const startedAt = Date.now();
        const deletedCount = await cleanTokens({db});
        logging.info({
            system: {
                event: 'clean_tokens.completed',
                deleted_count: deletedCount,
                duration_ms: Date.now() - startedAt
            }
        }, `Removed ${deletedCount} tokens older than 24 hours`);
    });
}
