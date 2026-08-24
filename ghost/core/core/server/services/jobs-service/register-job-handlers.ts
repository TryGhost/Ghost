import { getInstance } from './index';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';

const logging = require('@tryghost/logging');

export default function registerJobHandlers(): void {
  const jobsService = getInstance();
  const db = require('../../data/db');

  jobsService.handle(CleanTokensJob, async () => {
    await cleanTokens({ db, logging });
  });
}
