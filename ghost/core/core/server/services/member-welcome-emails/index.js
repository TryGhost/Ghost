const jobs = require('./jobs');

class MemberWelcomeEmailsServiceWrapper {
    init() {
        if (this.initialized) {
            return;
        }

        jobs.scheduleMemberWelcomeEmailJob();

        this.initialized = true;
    }
}

module.exports = new MemberWelcomeEmailsServiceWrapper();