// @ts-check
const urlUtils = require('../../../shared/url-utils');
const {oneAtATime} = require('../../../shared/one-at-a-time');
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

/**
 * @internal
 * @typedef {object} SchedulerIntegration
 * @prop {Array<{
 *     id: string;
 *     secret: string;
 * }>} api_keys
 */

class AutomationsService {
    #initialized = false;

    /**
     * @param {object} options
     * @param {Pick<DomainEvents, 'dispatch' | 'subscribe'>} options.domainEvents
     * @param {string} options.apiUrl
     * @param {SchedulerAdapter} options.schedulerAdapter
     * @param {SchedulerIntegration} options.schedulerIntegration
     * @returns {void}
     */
    init({domainEvents, apiUrl, schedulerAdapter, schedulerIntegration}) {
        if (this.#initialized) {
            return;
        }

        const enqueuePollNow = () => {
            domainEvents.dispatch(StartAutomationsPollEvent.create());
        };

        /**
         * @param {Readonly<Date>} date
         */
        const enqueuePollAt = (date) => {
            const signedAdminToken = getSignedAdminToken({
                publishedAt: date.toISOString(),
                apiUrl,
                integration: schedulerIntegration
            });
            const url = new URL(urlUtils.urlJoin(apiUrl, 'automations', 'poll'));
            url.searchParams.set('token', signedAdminToken);
            schedulerAdapter.schedule({
                time: date.getTime(),
                url: url.toString(),
                extra: {
                    httpMethod: 'PUT'
                }
            });
        };

        domainEvents.subscribe(StartAutomationsPollEvent, oneAtATime(async () => {
            await poll({
                memberWelcomeEmailService,
                enqueueAnotherPollNow: enqueuePollNow,
                enqueueAnotherPollAt: enqueuePollAt
            });
        }));

        enqueuePollNow();

        this.#initialized = true;
    }
}

module.exports = AutomationsService;
