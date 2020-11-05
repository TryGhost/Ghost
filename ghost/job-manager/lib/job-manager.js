const fastq = require('fastq');
const pWaitFor = require('p-wait-for');

const worker = async (task, callback) => {
    try {
        let result = await task();
        callback(null, result);
    } catch (error) {
        callback(error);
    }
};

const handler = (error, result) => {
    if (error) {
        throw error;
    }
    // Can potentially standardise the result here
    return result;
};

class JobManager {
    constructor(logging) {
        this.queue = fastq(this, worker, 1);
        this.logging = logging;
    }

    /**
     * Adds job to queue
     *
     * @param {Function} job function to be executed in the queue
     * @param {Object} [data] data to be passed into the job
     */
    addJob(job, data) {
        this.queue.push(async () => {
            await job(data);
        }, handler);
    }

    async shutdown(options) {
        if (this.queue.idle()) {
            return;
        }

        this.logging.warn('Waiting for busy job queue');

        await pWaitFor(() => this.queue.idle() === true, options);

        this.logging.warn('Job queue finished');
    }
}

module.exports = JobManager;
