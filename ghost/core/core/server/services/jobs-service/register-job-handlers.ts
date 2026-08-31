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
import type MentionController from '../mentions/mention-controller';
import ProcessWebmentionJob from '../mentions/process-webmention-job';
import SendEmailJob from '../email-service/jobs/send-email-job';

const updateCheck = require('../update-check');

interface RegisterJobHandlersDependencies {
  jobsService: JobsService;
  memberJobs: {
    cleanTokens(): Promise<number>;
    cleanExpiredComped(): Promise<unknown>;
  };
  giftService: GiftService;
  mediaInliner: ExternalMediaInliner;
  mentionsController: MentionController;
  batchSendingService: {
    emailJob(data: { emailId: string }): Promise<void>;
  };
}

export default function registerJobHandlers({
  jobsService,
  memberJobs,
  giftService,
  mediaInliner,
  mentionsController,
  batchSendingService,
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

  jobsService.handle(ProcessWebmentionJob, async (job) => {
    await mentionsController.processWebmention(job);
  });

  jobsService.handle(SendEmailJob, async (job) => {
    await batchSendingService.emailJob({ emailId: job.emailId });
  });
}
