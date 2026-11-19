import type { Slot } from '@tryghost/foundry/application';
import { backgroundSteps } from './transition/background-steps';
import type { BootRun } from './transition/legacy-steps';

// Tests start Ghost many times in one process. Nothing below the first entry
// may send, schedule or call out while they run. Decided once for each start,
// from the environment, when the second entry is reached: as boot always has.
// A test that needs the real entries changes NODE_ENV while the first one runs.
const outsideTests = ({ state }: BootRun) =>
  (state.backgroundOutsideTests ??= !process.env.NODE_ENV?.startsWith('test'));

/**
 * What the background step runs, in this order, once Ghost is serving.
 * `start()` does not wait for it. The framework runs each entry after the one
 * before it has settled, and logs a failure without stopping the rest: a
 * failed schedule cannot leave the entries after it unstarted for the life of
 * the process.
 *
 * Every entry is a legacy step today: a function of
 * `./transition/background-steps.ts`. An entry leaves this list when the
 * service it calls does that work when it is started.
 */
export const background: readonly Slot<BootRun>[] = [
  { name: 'inactive themes', run: backgroundSteps.inactiveThemes },
  { name: 'interrupted email sends', when: outsideTests, run: backgroundSteps.interruptedSends },
  {
    name: 'pending gift deliveries',
    when: outsideTests,
    run: backgroundSteps.pendingGiftDeliveries,
  },
  { name: 'gift cleanup job', when: outsideTests, run: backgroundSteps.giftCleanupJob },
  { name: 'gift reminder job', when: outsideTests, run: backgroundSteps.giftReminderJob },
  {
    name: 'member token cleanup job',
    when: outsideTests,
    run: backgroundSteps.memberTokenCleanupJob,
  },
  {
    name: 'expired comp cleanup job',
    when: outsideTests,
    run: backgroundSteps.expiredCompCleanupJob,
  },
  { name: 'signing key check job', when: outsideTests, run: backgroundSteps.signingKeyCheckJob },
  { name: 'auth cleanup job', when: outsideTests, run: backgroundSteps.authCleanupJob },
  { name: 'email analytics jobs', when: outsideTests, run: backgroundSteps.emailAnalyticsJobs },
  { name: 'activitypub', when: outsideTests, run: backgroundSteps.activityPub },
  { name: 'tinybird sync job', when: outsideTests, run: backgroundSteps.tinybirdSyncJob },
  { name: 'update check jobs', when: outsideTests, run: backgroundSteps.updateCheckJobs },
  { name: 'remote flags', when: outsideTests, run: backgroundSteps.remoteFlags },
  { name: 'milestones', when: outsideTests, run: backgroundSteps.milestones },
];
