const jobs = require('./jobs');

class WelcomeEmailsServiceWrapper {
    init() {
        if (this.initialized) {
            return;
        }

        jobs.scheduleWelcomeEmailJob();

        this.initialized = true;
    }
}

module.exports = new WelcomeEmailsServiceWrapper();