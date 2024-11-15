const assert = require('assert/strict');
const path = require('path');
const configUtils = require('../../utils/configUtils');
const models = require('../../../core/server/models');
const testUtils = require('../../utils/');

// Helper function to wait for job completion
async function waitForJobCompletion(jobName, maxWaitTimeMs = 5000, checkIntervalMs = 50) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const intervalId = setInterval(async () => {
            if (Date.now() - startTime >= maxWaitTimeMs) {
                clearInterval(intervalId);
                reject(new Error(`Job ${jobName} did not complete within ${maxWaitTimeMs}ms`));
            }
            const job = await models.Job.findOne({name: jobName});
            if (!job) {
                clearInterval(intervalId);
                resolve();
            }
        }, checkIntervalMs);
    });
}

describe('Job Queue', function () {
    let jobService;
    before(testUtils.setup('default')); // this generates the tables in the db
    afterEach(async function () {
        await configUtils.restore();
    });
    afterEach(testUtils.teardownDb);

    describe('enabled by config', function () {
        beforeEach(async function () {
            configUtils.set('services:jobs:queue:enabled', true);
            jobService = require('../../../core/server/services/jobs/job-service');
        });

        it('should add and execute a job in the queue', async function () {
            this.timeout(10000);
            const job = {
                name: `add-random-numbers-${Date.now()}`,
                metadata: {
                    job: path.resolve(__dirname, './test-job.js'),
                    data: {}
                }
            };

            // Add the job to the queue
            const result = await jobService.addQueuedJob(job);
            assert.ok(result);

            // Wait for the job to complete
            await waitForJobCompletion(job.name, 8000); // Increase wait time

            // Check job status
            const jobEntry = await models.Job.findOne({name: job.name});

            // Verify that the job no longer exists in the queue
            assert.equal(jobEntry, null);
        });
    });

    describe('not enabled', function () {
        beforeEach(async function () {
            configUtils.set('services:jobs:queue:enabled', false);
            jobService = require('../../../core/server/services/jobs/job-service');
        });
        
        it('should not add a job to the queue when disabled', async function () {
            const job = {
                name: `add-random-numbers-${Date.now()}`,
                metadata: {
                    job: path.resolve(__dirname, './test-job.js'),
                    data: {}
                }
            };

            // Attempt to add the job to the queue
            const result = await jobService.addQueuedJob(job);
            assert.equal(result, undefined);

            // Verify that the job doesn't exist in the queue
            const jobEntry = await models.Job.findOne({name: job.name});
            assert.equal(jobEntry, null);
        });
    });
});