import { getInstance } from './index';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';

const logging = require('@tryghost/logging');

export default function registerJobHandlers(): void {
  const jobsService = getInstance();
  const db = require('../../data/db');

  jobsService.handle(CleanTokensJob, async () => {
    const startedAt = Date.now();
    logging.info('[Background Job] clean-tokens started');

    try {
      const deletedCount = await cleanTokens({ db });
      const durationMs = Date.now() - startedAt;
      logging.info(
        {
          system: {
            event: 'clean_tokens.completed',
            deleted_count: deletedCount,
            duration_ms: durationMs,
          },
        },
        `[Background Job] clean-tokens completed in ${durationMs}ms: removed ${deletedCount} tokens older than 24 hours`,
      );
    } catch (error) {
      logging.error(
        error,
        `[Background Job] clean-tokens failed after ${Date.now() - startedAt}ms`,
      );
      throw error;
    }
  });
}
