const _ = require('lodash');
const logging = require('@tryghost/logging');
const DomainEvents = require('@tryghost/domain-events');
const {MilestoneCreatedEvent} = require('@tryghost/milestones');

module.exports = class DomainEventsAnalytics {
    #analytics;
    #trackDefaults;
    #prefix;
    #sentry;

    constructor(deps) {
        this.#analytics = deps.analytics;
        this.#trackDefaults = deps.trackDefaults;
        this.#prefix = deps.prefix;
        this.#sentry = deps.sentry;
    }

    async #handleMilestoneCreatedEvent(type, event) {
        if (type === MilestoneCreatedEvent
            && event.data.milestone
            && event.data.milestone.value === 100
        ) {
            const eventName = event.data.milestone.type === 'arr' ? '$100 MRR reached' : '100 members reached';

            try {
                this.#analytics.track(_.extend(this.#trackDefaults, {}, {event: this.#prefix + eventName}));
            } catch (err) {
                logging.error(err);
                this.#sentry.captureException(err);
            }
        }
    }

    subscribeToDomainEvents() {
        DomainEvents.subscribe(MilestoneCreatedEvent, async (event) => {
            await this.#handleMilestoneCreatedEvent(MilestoneCreatedEvent, event);
        });
    }
};
