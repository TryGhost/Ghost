import errors from '@tryghost/errors';
import { JobsService } from './jobs-service';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';
import * as gifts from '../gifts';
import CleanGiftsJob from '../gifts/jobs/clean-gifts-job';

interface RegisterJobHandlersDependencies {
  jobsService: JobsService;
  db: typeof import('../../data/db');
  logging: typeof import('@tryghost/logging');
}

export default function registerJobHandlers({
  jobsService,
  db,
  logging,
}: RegisterJobHandlersDependencies): void {
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
}
