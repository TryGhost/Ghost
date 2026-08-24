import type { JobsService } from './jobs-service';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';
import ExternalMediaInlinerJob from '../media-inliner/external-media-inliner-job';

const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const mediaInlinerService = require('../media-inliner');

export default function registerJobHandlers(jobsService: JobsService): void {
  const db = require('../../data/db');

  jobsService.handle(CleanTokensJob, async () => {
    await cleanTokens({ db, logging });
  });

  jobsService.handle(ExternalMediaInlinerJob, async (job) => {
    const inliner = mediaInlinerService.inliner;
    if (!inliner) {
      throw new errors.IncorrectUsageError({
        message: 'media-inliner service used before init()',
      });
    }
    await inliner.inline(job.domains);
  });
}
