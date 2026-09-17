import { JobsService } from './jobs-service';
import type { JobHandlingOptions } from './jobs-service';
import type { GiftService } from '../gifts/gift-service';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import CleanExpiredCompedJob from '../members/jobs/clean-expired-comped-job';
import CleanGiftsJob from '../gifts/jobs/clean-gifts-job';
import SendGiftRemindersJob from '../gifts/jobs/send-gift-reminders-job';
import ExternalMediaInliner from '../media-inliner/external-media-inliner';
import ExternalMediaInlinerJob from '../media-inliner/external-media-inliner-job';
import ContentCSVImportJob from '../content-import/jobs/content-csv-import-job';
import * as contentImport from '../content-import';
import MembersImportJob from '../members/jobs/members-import-job';
import UpdateCheckJob from '../update-check/jobs/update-check-job';
import type MentionController from '../mentions/mention-controller';
import type MentionSendingService from '../mentions/mention-sending-service';
import ProcessWebmentionJob from '../mentions/process-webmention-job';
import SendWebmentionsJob from '../mentions/send-webmentions-job';
import type EmailService from '../email-service/email-service';
import SendEmailJob from '../email-service/jobs/send-email-job';

const updateCheck = require('../update-check');

// Webmention processing fetches external pages and is triggered by
// unauthenticated requests, so webmention jobs run in their own lane where a
// flood cannot occupy the shared workers. The concurrency matches the old
// dedicated mentions job queue. Every webmention job type must register with
// this shared declaration so none can declare the queue with a different
// concurrency.
const WEBMENTIONS_QUEUE: JobHandlingOptions = { queue: 'webmentions', concurrency: 3 };

// Keep newsletter sends independent of imports and other shared work. Two sends
// can progress at once, each with its own two batch workers, so a long send or
// retry does not hold up every other newsletter.
const EMAIL_QUEUE: JobHandlingOptions = { queue: 'email', concurrency: 2 };

interface RegisterJobHandlersDependencies {
  jobsService: JobsService;
  memberJobs: {
    cleanTokens(): Promise<number>;
    cleanExpiredComped(): Promise<unknown>;
  };
  giftService: GiftService;
  mediaInliner: ExternalMediaInliner;
  mentionsController: MentionController;
  mentionsSendingService: MentionSendingService;
  membersService: {
    handleImportJob(job: MembersImportJob): Promise<void>;
  };
  emailService: EmailService;
}

export default function registerJobHandlers({
  jobsService,
  memberJobs,
  giftService,
  mediaInliner,
  mentionsController,
  mentionsSendingService,
  membersService,
  emailService,
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

  jobsService.handle(SendGiftRemindersJob, async () => {
    await giftService.processReminders();
  });

  jobsService.handle(ExternalMediaInlinerJob, async (job) => {
    await mediaInliner.inline(job.domains);
  });

  jobsService.handle(ContentCSVImportJob, async (job) => {
    await contentImport.handleJob(job);
  });

  jobsService.handle(MembersImportJob, async (job) => {
    await membersService.handleImportJob(job);
  });

  jobsService.handle(UpdateCheckJob, async () => {
    await updateCheck({ rethrowErrors: true });
  });

  jobsService.handle(
    ProcessWebmentionJob,
    async (job) => {
      await mentionsController.processWebmention(job);
    },
    WEBMENTIONS_QUEUE,
  );

  jobsService.handle(
    SendWebmentionsJob,
    async (job) => {
      await mentionsSendingService.sendWebmentions(job);
    },
    WEBMENTIONS_QUEUE,
  );

  jobsService.handle(
    SendEmailJob,
    async (job) => {
      await emailService.handleSendEmailJob(job);
    },
    EMAIL_QUEUE,
  );
}
