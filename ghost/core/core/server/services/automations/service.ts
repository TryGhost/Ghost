import type {InternalKeys} from '../internal-keys';
// @ts-expect-error @tryghost/domain-events currently lacks type declarations.
import type DomainEvents from '@tryghost/domain-events';
import {oneAtATime} from '../../../shared/one-at-a-time';
import {poll} from './poll';
import * as automationsApi from './automations-api';

const urlUtils = require('../../../shared/url-utils');
const logging = require('@tryghost/logging');
const {getSignedAdminToken} = require('../../adapters/scheduling/utils');
const StartAutomationsPollEvent = require('./events/start-automations-poll-event');
const {welcomeEmailAutomationPoll} = require('./welcome-email-automation-poll');
const memberWelcomeEmailService = require('../member-welcome-emails/service');

type SchedulerAdapter = {
    schedule(job: {
        extra: {
            httpMethod: string;
        };
        time: number;
        url: string;
    }): void;
    register(rescheduler: {rescheduleAll: () => unknown}): void;
};

type AutomationsServiceOptions = {
    apiUrl: string;
    domainEvents: Pick<DomainEvents, 'dispatch' | 'subscribe'>;
    internalKeys: InternalKeys;
    schedulerAdapter: SchedulerAdapter;
};

export class AutomationsService {
    #enqueuePollNow: undefined | (() => void);

    init({domainEvents, apiUrl, schedulerAdapter, internalKeys}: AutomationsServiceOptions): void {
        const isInitialized = Boolean(this.#enqueuePollNow);
        if (isInitialized) {
            return;
        }

        const enqueuePollNow = () => domainEvents.dispatch(StartAutomationsPollEvent.create());

        const enqueuePollAt = async (date: Readonly<Date>): Promise<void> => {
            const isRequestedDateInTheFuture = new Date() < date;
            if (!isRequestedDateInTheFuture) {
                // Dispatch a task instead of calling immediately to resolve issues with better-sqlite3
                // being synchronous and blocking the schedulerAdapter.schedule call below, which can
                // cause a deadlock in some cases.
                setImmediate(() => enqueuePollNow());
                return;
            }

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
            enqueueAnotherPollAt: enqueuePollAt
        })));

        domainEvents.subscribe(StartAutomationsPollEvent, oneAtATime(async () => welcomeEmailAutomationPoll({
            memberWelcomeEmailService,
            enqueueAnotherPollAt: enqueuePollAt
        })));

        schedulerAdapter.register(this);

        enqueuePollAt(new Date());

        this.#enqueuePollNow = enqueuePollNow;
    }

    /**
     * Re-arm the poll chain. A queued poll signed under the previous scheduler
     * key fails JWT verification when fired; this dispatches a fresh in-process
     * poll that re-schedules the next callback under the current key.
     */
    rescheduleAll(): void {
        this.#enqueuePollNow?.();
    }
}
