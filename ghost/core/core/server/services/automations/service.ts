import assert from 'node:assert/strict';
import type {SchedulerAdapter} from '@tryghost/adapter-base-scheduling';
import type {InternalKeys} from '../internal-keys';
// @ts-expect-error @tryghost/domain-events currently lacks type declarations.
import type DomainEvents from '@tryghost/domain-events';
import {oneAtATime} from '../../../shared/one-at-a-time';
import {poll} from './poll';
import * as automationsApi from './automations-api';
import {setImmediate as flushEventLoop} from 'node:timers/promises';
import {SoonestTimer} from '../../lib/soonest-timer';
// @ts-expect-error This module currently lacks type definitions.
import emailAnalyticsJobs from '../email-analytics/jobs';

const urlUtils = require('../../../shared/url-utils');
const logging = require('@tryghost/logging');
const {getSignedAdminToken} = require('../../adapters/scheduling/utils');
const StartAutomationsPollEvent = require('./events/start-automations-poll-event');
const {MemberLinkClickEvent} = require('../../../shared/events');
const {welcomeEmailAutomationPoll} = require('./welcome-email-automation-poll');
const memberWelcomeEmailService = require('../member-welcome-emails/service');

type AutomationsServiceOptions = {
    apiUrl: string;
    clickTrackingApi?: Pick<typeof automationsApi, 'recordAutomationEmailClick'>;
    domainEvents: Pick<DomainEvents, 'dispatch' | 'subscribe'>;
    internalKeys: InternalKeys;
    schedulerAdapter: Pick<SchedulerAdapter, 'schedule' | 'register'>;
};

const scheduleAutomationEmailAnalyticsJob = () => (
    emailAnalyticsJobs.scheduleRecurringAutomationsJob(true)
);

export class AutomationsService {
    #enqueuePollAt: undefined | ((date: Readonly<Date>) => Promise<void>);

    init({domainEvents, apiUrl, clickTrackingApi = automationsApi, schedulerAdapter, internalKeys}: AutomationsServiceOptions): void {
        const isInitialized = Boolean(this.#enqueuePollAt);
        if (isInitialized) {
            return;
        }

        const enqueuePollNow = () => domainEvents.dispatch(StartAutomationsPollEvent.create());

        const soonestTimer = new SoonestTimer(enqueuePollNow);

        /**
         * Enqueue an automations poll at a given time.
         *
         * If the poll is in the future, we schedule an in-memory timer *and*
         * tell the scheduler.
         *
         * The in-memory timer can be more precise than the scheduler, and
         * avoids reliance on an external service. The scheduler will wake up
         * the server if it's stopped.
         *
         * (In an upcoming change (NY-1396), we plan to make the scheduler less
         * precise to reduce load--that will make the in-memory timer more
         * useful, but it's still useful now.)
         */
        const enqueuePollAt = async (date: Readonly<Date>): Promise<void> => {
            const isRequestedDateInTheFuture = new Date() < date;
            if (!isRequestedDateInTheFuture) {
                // If you're using synchronous SQLite, we want to finish unwinding the call stack
                // before dispatching another poll event.
                await flushEventLoop();
                enqueuePollNow();
                return;
            }

            soonestTimer.scheduleAt(date);

            try {
                const key = await internalKeys.get('ghost-scheduler');
                const signedAdminToken = getSignedAdminToken({publishedAt: date.toISOString(), apiUrl, key});
                const url = new URL(urlUtils.urlJoin(apiUrl, 'automations', 'poll'));
                url.searchParams.set('token', signedAdminToken);
                schedulerAdapter.schedule({time: date.getTime(), url: url.toString(), extra: {httpMethod: 'PUT'}});
            } catch (err) {
                logging.error({event: {name: 'automations.enqueue-poll.error'}, err, at: date.toISOString()}, 'Failed to enqueue automations poll');
            }
        };

        domainEvents.subscribe(StartAutomationsPollEvent, oneAtATime(async () => poll({
            automationsApi,
            memberWelcomeEmailService,
            scheduleAutomationEmailAnalyticsJob,
            enqueueAnotherPollAt: enqueuePollAt
        })));

        domainEvents.subscribe(StartAutomationsPollEvent, oneAtATime(async () => welcomeEmailAutomationPoll({
            memberWelcomeEmailService,
            enqueueAnotherPollAt: enqueuePollAt
        })));

        domainEvents.subscribe(MemberLinkClickEvent, async (event: {timestamp: Date; data: {memberId: string; linkId: string}}) => {
            try {
                await clickTrackingApi.recordAutomationEmailClick({
                    clickedAt: event.timestamp,
                    memberId: event.data.memberId,
                    redirectId: event.data.linkId
                });
            } catch (err) {
                logging.error({err, memberId: event.data.memberId, redirectId: event.data.linkId}, 'Failed to record automation email click');
            }
        });

        schedulerAdapter.register(this);

        enqueuePollAt(new Date());

        this.#enqueuePollAt = enqueuePollAt;
    }

    /**
     * Re-arm the poll chain. A queued poll signed under the previous scheduler
     * key fails JWT verification when fired; this dispatches a fresh in-process
     * poll that re-schedules the next callback under the current key.
     */
    async rescheduleAll(): Promise<void> {
        await this.#enqueuePollAt?.(new Date());
    }

    async __testOnlyEnqueuePollAt(date: Readonly<Date>): Promise<void> {
        assert(this.#enqueuePollAt, 'Tests should not call this before initialization');
        return await this.#enqueuePollAt(date);
    }
}
