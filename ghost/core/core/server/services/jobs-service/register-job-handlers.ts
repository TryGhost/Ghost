import { getInstance } from './index';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';
import ExternalMediaInlinerJob from '../media-inliner/external-media-inliner-job';

const logging = require('@tryghost/logging');
const mediaInliner = require('../media-inliner');

export default function registerJobHandlers(): void {
  const jobsService = getInstance();
  const db = require('../../data/db');

  jobsService.handle(CleanTokensJob, async () => {
    await cleanTokens({ db, logging });
  });

  jobsService.handle(ExternalMediaInlinerJob, async (job) => {
    await mediaInliner.getInstance().inline(job.domains);
  });
}
