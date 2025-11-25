const jobs = require('./jobs');
const StartMemberWelcomeEmailJobEvent = require('./events/StartMemberWelcomeEmailJobEvent');
const domainEvents = require('@tryghost/domain-events');
const processOutbox = require('./jobs/lib/process-outbox');

class MemberWelcomeEmailsServiceWrapper {
    init() {
        if (this.initialized) {
            return;
        }

        jobs.scheduleMemberWelcomeEmailJob();

        // We currently cannot trigger a non-offloaded job from the job manager
        // So the member welcome email job simply emits an event that we listen for here
        // This allows the actual processing to run on the main thread instead of in a worker
        domainEvents.subscribe(StartMemberWelcomeEmailJobEvent, async () => {
            await processOutbox();
        });

        this.initialized = true;
    }
}

module.exports = new MemberWelcomeEmailsServiceWrapper();
