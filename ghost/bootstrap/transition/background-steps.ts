import type { BootRun } from './legacy-steps';

/**
 * What Ghost starts once it is serving and does not wait for: one function for
 * each entry of `../background.ts`, which holds the order. The framework runs
 * them one after another and logs a failure without stopping the rest, so no
 * function here catches its own errors.
 *
 * Transitional. Each of these belongs to the service it calls: it leaves this
 * file when that service schedules its own jobs or does its own recovery when
 * it is started.
 *
 * Every module is required inside the function that uses it, so listing the
 * steps loads nothing.
 */

const jobs = () => require('../../core/server/services/jobs-service').getInstance();

export const backgroundSteps = {
  inactiveThemes: (): void => {
    const themeService = require('../../core/server/services/themes');
    themeService.loadInactiveThemes();
  },

  // Resumes newsletter sends interrupted by a prior container shutdown.
  interruptedSends: async (): Promise<void> => {
    const emailService = require('../../core/server/services/email-service');
    await emailService.service.resumeInterruptedSends();
  },

  // Retries gift deliveries interrupted by a prior shutdown. Not awaited:
  // recovery sends one at a time and must not hold up the entries after it.
  pendingGiftDeliveries: (): void => {
    const giftService = require('../../core/server/services/gifts');
    giftService.recoverPendingDeliveries();
  },

  giftCleanupJob: async (): Promise<void> => {
    const giftJobs = require('../../core/server/services/gifts/jobs');
    await giftJobs.scheduleGiftCleanupJob(jobs());
  },

  giftReminderJob: async (): Promise<void> => {
    const giftJobs = require('../../core/server/services/gifts/jobs');
    await giftJobs.scheduleGiftReminderJob(jobs());
  },

  memberTokenCleanupJob: async (): Promise<void> => {
    const memberJobs = require('../../core/server/services/members/jobs');
    await memberJobs.scheduleTokenCleanupJob(jobs());
  },

  expiredCompCleanupJob: async (): Promise<void> => {
    const memberJobs = require('../../core/server/services/members/jobs');
    await memberJobs.scheduleExpiredCompCleanupJob(jobs());
  },

  signingKeyCheckJob: async (): Promise<void> => {
    // Not typed from the root: its types reach every dependency of signing
    // keys, and not all of them pass the stricter settings of the packages
    // that compile this folder.
    const signingKeys = require('../../core/server/services/signing-keys').default;
    await signingKeys.extras.scheduleCheckJob(jobs());
  },

  authCleanupJob: async (): Promise<void> => {
    const authCleanup = require('../../core/server/auth/better-auth/cleanup');
    await authCleanup.scheduleClearExpiredJob(jobs());
  },

  // The scheduler decides whether these are configured.
  emailAnalyticsJobs: async (): Promise<void> => {
    const emailAnalyticsJobs = require('../../core/server/services/email-analytics/jobs');
    await emailAnalyticsJobs.scheduleRecurringJobs();
  },

  activityPub: async (): Promise<void> => {
    const activitypub = require('../../core/server/services/activitypub');
    await activitypub.init();
  },

  tinybirdSyncJob: async (): Promise<void> => {
    const tinybirdSync = require('../../core/server/services/tinybird-sync');
    await tinybirdSync.scheduleJob(jobs());
  },

  updateCheckJobs: async (): Promise<void> => {
    const updateCheck = require('../../core/server/services/update-check');
    await updateCheck.scheduleJobs(jobs());
  },

  // Remote feature-flag overrides: inert unless configured.
  remoteFlags: ({ foundation }: BootRun): void => {
    const remoteFlags = require('../../core/server/services/remote-flags');
    remoteFlags.init(foundation.config);
  },

  // Not awaited, as before: it starts its own run.
  milestones: (): void => {
    const milestonesService = require('../../core/server/services/milestones');
    milestonesService.initAndRun();
  },
};
