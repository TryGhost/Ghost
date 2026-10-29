import EmailAnalyticsGiftFetchLatestJob from '../email-analytics/jobs/email-analytics-gift-fetch-latest-job';
import EmailAnalyticsAutomationFetchLatestJob from '../email-analytics/jobs/email-analytics-automation-fetch-latest-job';
import EmailAnalyticsFetchLatestJob from '../email-analytics/jobs/email-analytics-fetch-latest-job';
import type { EmailAnalyticsServiceWrapper } from '../email-analytics/email-analytics-service-wrapper';
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
import ContentImportJob from '../../data/importer/jobs/content-import-job';
import MembersImportJob from '../members/jobs/members-import-job';
import UpdateCheckJob from '../update-check/jobs/update-check-job';
import TinybirdSyncJob from '../tinybird-sync/jobs/tinybird-sync-job';
import type MentionController from '../mentions/mention-controller';
import type MentionSendingService from '../mentions/mention-sending-service';
import ProcessWebmentionJob from '../mentions/process-webmention-job';
import SendWebmentionsJob from '../mentions/send-webmentions-job';
import type EmailService from '../email-service/email-service';
import SendEmailJob from '../email-service/jobs/send-email-job';
import CheckSigningKeysJob from '../signing-keys/check-signing-keys-job';
import signingKeys from '../signing-keys';

const updateCheck = require('../update-check');

// Newsletter sends and email analytics share a lane, so neither waits behind
// imports or other default-lane work. Each analytics pipeline fetches on its
// own five-minute tick and its wrapper skips a tick while the previous fetch
// is still running. An overlapping tick holds a slot only long enough to reach
// that guard and be skipped, instead of queueing behind the running fetch and
// firing late. So the three pipelines hold at most three slots for long, and
// at least two sends can always progress, each with its own two batch workers.
const EMAIL_QUEUE: JobHandlingOptions = { queue: 'email', concurrency: 5 };

interface RegisterJobHandlersDependencies {
  jobsService: JobsService;
  gifts: Pick<EmailAnalyticsServiceWrapper, 'startFetch'>;
  automations: Pick<EmailAnalyticsServiceWrapper, 'startFetch'>;
  newsletters: Pick<EmailAnalyticsServiceWrapper, 'startFetch'>;
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
  siteImporter: {
    executeImport(job: ContentImportJob): Promise<unknown>;
  };
  tinybirdSync: {
    sync(): Promise<void>;
  };
}

export default function registerJobHandlers({
  jobsService,
  gifts,
  automations,
  newsletters,
  memberJobs,
  giftService,
  mediaInliner,
  mentionsController,
  mentionsSendingService,
  membersService,
  emailService,
  siteImporter,
  tinybirdSync,
}: RegisterJobHandlersDependencies): void {
  for (const [JobClass, pipeline] of [
    [EmailAnalyticsFetchLatestJob, newsletters],
    [EmailAnalyticsAutomationFetchLatestJob, automations],
    [EmailAnalyticsGiftFetchLatestJob, gifts],
  ] as const) {
    jobsService.handle(JobClass, () => pipeline.startFetch(), EMAIL_QUEUE);
  }

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

  jobsService.handle(ContentImportJob, async (job) => {
    await siteImporter.executeImport(job);
  });

  jobsService.handle(MembersImportJob, async (job) => {
    await membersService.handleImportJob(job);
  });

  jobsService.handle(UpdateCheckJob, async () => {
    await updateCheck({ rethrowErrors: true });
  });

  jobsService.handle(CheckSigningKeysJob, async () => {
    await signingKeys.service.check();
  });

  // Webmention processing fetches external pages and is triggered by
  // unauthenticated requests, so a flood can delay other default-lane jobs.
  // It cannot reach newsletter sends or email analytics, which have their own
  // lane. Capping in-flight webmentions is a follow-up.
  jobsService.handle(ProcessWebmentionJob, async (job) => {
    await mentionsController.processWebmention(job);
  });

  jobsService.handle(SendWebmentionsJob, async (job) => {
    await mentionsSendingService.sendWebmentions(job);
  });

  jobsService.handle(
    SendEmailJob,
    async (job) => {
      await emailService.handleSendEmailJob(job);
    },
    EMAIL_QUEUE,
  );

  jobsService.handle(TinybirdSyncJob, async () => {
    await tinybirdSync.sync();
  });
}
