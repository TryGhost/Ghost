// @ts-check
const urlUtils = require('../../../shared/url-utils');
const {oneAtATime} = require('../../../shared/one-at-a-time');
const logging = require('@tryghost/logging');
const {getSignedAdminToken} = require('../../adapters/scheduling/utils');
const StartAutomationsPollEvent = require('./events/start-automations-poll-event');
const {poll} = require('./poll');
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
            memberWelcomeEmailService,
            enqueueAnotherPollNow: this.#enqueuePollNow,
            enqueueAnotherPollAt: enqueuePollAt
        })));

        this.#enqueuePollNow();
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

module.exports = new AutomationsService();
