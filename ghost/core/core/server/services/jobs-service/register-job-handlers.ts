import { JobsService } from './jobs-service';
import type { GiftService } from '../gifts/gift-service';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import CleanExpiredCompedJob from '../members/jobs/clean-expired-comped-job';
import CleanGiftsJob from '../gifts/jobs/clean-gifts-job';
import ExternalMediaInliner from '../media-inliner/external-media-inliner';
import ExternalMediaInlinerJob from '../media-inliner/external-media-inliner-job';
import ContentCSVImportJob from '../content-import/jobs/content-csv-import-job';
import * as contentImport from '../content-import';
import UpdateCheckJob from '../update-check/jobs/update-check-job';

const updateCheck = require('../update-check');

interface RegisterJobHandlersDependencies {
  jobsService: JobsService;
  memberJobs: {
    cleanTokens(): Promise<number>;
    cleanExpiredComped(): Promise<unknown>;
  };
  giftService: GiftService;
  mediaInliner: ExternalMediaInliner;
}

export default function registerJobHandlers({
  jobsService,
  memberJobs,
  giftService,
  mediaInliner,
}: RegisterJobHandlersDependencies): void {
  jobsService.handle(CleanTokensJob, async () => {
    await memberJobs.cleanTokens();
  });

  jobsService.handle(CleanExpiredCompedJob, async () => {
    await memberJobs.cleanExpiredComped();
  });

  jobsService.handle(CleanGiftsJob, async () => {
    await giftService.cleanup();
  });

  jobsService.handle(ExternalMediaInlinerJob, async (job) => {
    await mediaInliner.inline(job.domains);
  });

  jobsService.handle(ContentCSVImportJob, async (job) => {
    await contentImport.handleJob(job);
  });

  jobsService.handle(UpdateCheckJob, async () => {
    await updateCheck({ rethrowErrors: true });
  });
}
