// @ts-check
const {oneAtATime} = require('../../../shared/one-at-a-time');
const StartAutomationsPollEvent = require('./events/start-automations-poll-event');
const {poll} = require('./poll');
const memberWelcomeEmailService = require('../member-welcome-emails/service');
/** @import DomainEvents from '@tryghost/domain-events' */

class WelcomeEmailAutomationsService {
    #initialized = false;

    /**
     * @param {Pick<DomainEvents, 'dispatch' | 'subscribe'>} domainEvents
     * @returns {void}
     */
    init(domainEvents) {
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
            // TODO(NY-1191): Use Scheduler instead of `setTimeout`.
            setTimeout(enqueuePollNow, date.getTime() - Date.now());
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

module.exports = WelcomeEmailAutomationsService;
