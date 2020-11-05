// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const JobManager = new require('../index');

describe('Job Manager', function () {
    it('public interface', function () {
        const jobManager = new JobManager();

        should.exist(jobManager.addJob);
        should.exist(jobManager.scheduleJob);
    });

    describe('Schedule Job', function () {
        it ('fails to run for invalid scheduling expression', function () {
            const jobManager = new JobManager();

            try {
                jobManager.scheduleJob(() => {}, {}, 'invalid expression');
            } catch (err) {
                err.message.should.equal('Invalid schedule format');
            }
        });
    });
});
