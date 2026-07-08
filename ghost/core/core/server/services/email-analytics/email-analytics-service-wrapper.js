const logging = require('@tryghost/logging');

class EmailAnalyticsServiceWrapper {
    fetching = false;

    init() {
        const StartEmailAnalyticsJobEvent = require('./events/start-email-analytics-job-event');
        const domainEvents = require('@tryghost/domain-events');

        // We currently cannot trigger a non-offloaded job from the job manager
        // So the email analytics jobs simply emits an event.
        domainEvents.subscribe(StartEmailAnalyticsJobEvent, async () => {
            await this.startFetch();
        });
    }

    async startFetch() {
        // TODO: Restore scheduled?

        if (this.fetching) {
            logging.info('Email analytics fetch already running, skipping');
            return;
        }
        this.fetching = true;

        try {
            const eventBatches = getEventBatches();

            for await (const eventBatch of eventBatches) {
                // TODO: Don't hard-code these values.
                // TODO: Is there a better name than "otherEmails"?
                // TODO: Is this the best way to do this grouping?
                const grouped = Object.groupBy(eventBatch, (event) => (
                    event.tags.includes('automation-email') ? 'automationEmails' : 'otherEmails'
                ));
                const otherEmails = grouped.otherEmails ?? [];
                const automationEmails = grouped.automationEmails ?? [];

                await Promise.all([
                    processOtherEmails(otherEmails),
                    processAutomationEmails(automationEmails)
                ]);
            }

            logging.info('[EmailAnalytics] Job complete - No events');
        } catch (e) {
            logging.error(e, 'Error while fetching email analytics');

            // Log again only the error, otherwise we lose the stack trace
            logging.error(e);
        } finally {
            this.fetching = false;
        }
    }
}
