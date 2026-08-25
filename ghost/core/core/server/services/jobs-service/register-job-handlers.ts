import errors from '@tryghost/errors';
import { getInstance } from './index';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';
import * as gifts from '../gifts';
import CleanGiftsJob from '../gifts/jobs/clean-gifts-job';
import ExternalMediaInlinerJob from '../media-inliner/jobs/external-media-inliner-job';

const logging = require('@tryghost/logging');

export interface JobHandlerDeps {
  mediaInliner: { inline(domains: string[]): Promise<unknown> };
}

export default function registerJobHandlers({ mediaInliner }: JobHandlerDeps): void {
  const jobsService = getInstance();
  const db = require('../../data/db');

  jobsService.handle(CleanTokensJob, async () => {
    await cleanTokens({ db, logging });
  });

  jobsService.handle(CleanGiftsJob, async () => {
    if (!gifts.service) {
      throw new errors.IncorrectUsageError({
        message: 'clean-gifts ran before the gifts service was initialised',
      });
    }
    await gifts.service.cleanup();
  });

  jobsService.handle(ExternalMediaInlinerJob, async (job) => {
    await mediaInliner.inline(job.domains);
  });
}
