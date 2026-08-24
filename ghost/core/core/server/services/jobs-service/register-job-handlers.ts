import type { JobsService } from './jobs-service';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';

const logging = require('@tryghost/logging');

export default function registerJobHandlers(jobsService: JobsService): void {
  const db = require('../../data/db');

  jobsService.handle(CleanTokensJob, async () => {
    await cleanTokens({ db, logging });
  });
}
