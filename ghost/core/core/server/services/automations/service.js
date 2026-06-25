// @ts-check
const urlUtils = require('../../../shared/url-utils');
const {oneAtATime} = require('../../../shared/one-at-a-time');
const logging = require('@tryghost/logging');
const {getSignedAdminToken} = require('../../adapters/scheduling/utils');
const StartAutomationsPollEvent = require('./events/start-automations-poll-event');
const {poll} = require('./poll');
const {welcomeEmailAutomationPoll} = require('./welcome-email-automation-poll');
const automationsApi = require('./automations-api');
const memberWelcomeEmailService = require('../member-welcome-emails/service');
/** @import DomainEvents from '@tryghost/domain-events' */

/**
 * @internal
 * @typedef {object} SchedulerAdapter
 * @prop {(job: {
 *     time: number;
 *     url: string;
 *     extra: {
 *         httpMethod: string;
 *     };
 * }) => void} schedule
 * @prop {(rescheduler: {rescheduleAll: () => unknown}) => void} register
 */

class AutomationsService {
    #initialized = false;
    #enqueuePollNow;

    /**
     * @param {object} options
     * @param {Pick<DomainEvents, 'dispatch' | 'subscribe'>} options.domainEvents
     * @param {string} options.apiUrl
     * @param {SchedulerAdapter} options.schedulerAdapter
     * @param {ReadonlyMap<string, Promise<{id: string, secret: string}>>} options.internalKeys
     * @returns {void}
     */
    init({domainEvents, apiUrl, schedulerAdapter, internalKeys}) {
        if (this.#initialized) {
            return;
        }

        this.#enqueuePollNow = () => domainEvents.dispatch(StartAutomationsPollEvent.create());

        /** @param {Readonly<Date>} date */
        const enqueuePollAt = async (date) => {
            const isRequestedDateInTheFuture = new Date() < date;
            if (!isRequestedDateInTheFuture) {
                // Re-dispatch on the next macrotask rather than synchronously, so a
                // self-rescheduling poll chain yields the event loop between
                // iterations. The synchronous better-sqlite3 driver resolves its
                // awaited queries on the microtask queue, so an immediate in-process
                // re-dispatch starves timers and I/O — the chain spins on microtasks
                // and never lets the process settle. (The async sqlite3 driver hid
                // this: its queries resolved via libuv I/O macrotasks, which gave the
                // rest of the loop a turn each iteration.) setImmediate restores that.
                setImmediate(() => this.#enqueuePollNow());
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

        this.#initialized = true;
    }

    /**
     * Re-arm the poll chain. A queued poll signed under the previous scheduler
     * key fails JWT verification when fired; this dispatches a fresh in-process
     * poll that re-schedules the next callback under the current key.
     */
    rescheduleAll() {
        this.#enqueuePollNow?.();
    }
}

module.exports = AutomationsService;
