import { getInstance } from './index';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';
import MediaInlinerJob from '../media-inliner/media-inliner-job';

const jobLogging = require('../jobs/job-logging');

export default function registerJobHandlers(): void {
  const jobsService = getInstance();
  const db = require('../../data/db');
  const mediaInlinerService = require('../media-inliner');

  jobsService.handle(CleanTokensJob, async () => {
    const startedAt = Date.now();
    jobLogging.info('[Background Job] clean-tokens started');

    try {
      const deletedCount = await cleanTokens({ db });
      const durationMs = Date.now() - startedAt;
      jobLogging.info(
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
      jobLogging.error(
        error,
        `[Background Job] clean-tokens failed after ${Date.now() - startedAt}ms`,
      );
      throw error;
    }
  });

  jobsService.handle(MediaInlinerJob, async (job: MediaInlinerJob) => {
    const startedAt = Date.now();
    jobLogging.info('[Background Job] external-media-inliner started');

    try {
      await mediaInlinerService.inline(job.domains);
      jobLogging.info(
        `[Background Job] external-media-inliner completed in ${Date.now() - startedAt}ms`,
      );
    } catch (err) {
      jobLogging.error(
        err,
        `[Background Job] external-media-inliner failed after ${Date.now() - startedAt}ms`,
      );
      throw err;
    }
  });
}
