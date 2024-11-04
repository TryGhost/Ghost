const ObjectID = require('bson-objectid').default;
const logging = require('@tryghost/logging');

/**
 * @class JobsRepository
 * @description Repository class for managing job-related operations.
 */
class JobsRepository {
    /**
     * @constructor
     * @param {Object} options - The options object.
     * @param {Object} options.JobModel - The Job model for database operations.
     */
    constructor({JobModel}) {
        // NOTE: We ought to clean this up. We want to use bookshelf models for all db operations,
        //  but we use knex directly in a few places still largely for performance reasons.
        this._JobModel = JobModel;
    }

    /**
     * @method add
     * @async
     * @description Adds a new job to the database.
     * @param {Object} data - The job data to be added.
     * @returns {Promise<Object>} The added job object.
     */
    async add(data) {
        const job = await this._JobModel.add(data);
        return job;
    }

    /**
     * @method read
     * @async
     * @description Reads a job from the database by name.
     * @param {string} name - The name of the job to read.
     * @returns {Promise<Object|null>} The job object if found, null otherwise.
     */
    async read(name) {
        const job = await this._JobModel.findOne({name});
        return job;
    }

    /**
     * @method update
     * @async
     * @description Updates a job in the database.
     * @param {string} id - The ID of the job to update.
     * @param {Object} data - The updated job data.
     * @returns {Promise<void>}
     */
    async update(id, data) {
        await this._JobModel.edit(data, {id});
    }

    /**
     * @method getNextQueuedJob
     * @async
     * @description Retrieves the next queued job from the database.
     * @returns {Promise<Object|null>} The next queued job object if found, null otherwise.
     */
    async getNextQueuedJob() {
        const job = await this._JobModel.findOne({
            queue_entry: 1
        });
        return job;
    }

    /**
     * @method getQueuedJobs
     * @async
     * @description Retrieves a list of queued jobs from the database.
     * @param {number} [limit=50] - The maximum number of jobs to retrieve.
     * @returns {Promise<Array>} An array of queued job objects.
     */
    async getQueuedJobs(limit = 50) {
        const jobs = await this._JobModel.findPage({
            filter: 'queue_entry:1',
            limit
        });
        return jobs.data;
    }

    /**
     * @typedef {Object} QueuedJob
     * @property {string} name - The name or identifier of the job.
     * @property {Object} metadata - Metadata associated with the job.
     * @property {string} metadata.job - The absolute path to the job to execute.
     * @property {Object} metadata.data - The data associated with the job.
     */

    /**
     * @method addQueuedJob
     * @async
     * @description Adds a new queued job to the database.
     * @param {QueuedJob} job - The job to be added to the queue.
     * @returns {Promise<Object>} The added job object.
     */
    async addQueuedJob({name, metadata}) {
        let job;
        await this._JobModel.transaction(async (transacting) => {
            // Check if a job with this name already exist
            const existingJob = await this._JobModel.findOne({name}, {transacting});
            if (!existingJob) {
                // If no existing job, create a new one
                job = await this._JobModel.add({
                    id: new ObjectID().toHexString(),
                    name: name,
                    status: 'queued',
                    created_at: new Date(),
                    metadata: JSON.stringify(metadata),
                    queue_entry: 1
                }, {transacting});
            }
            // If existingJob is found, do nothing (equivalent to IGNORE)
        });
        
        return job; // Will be undefined if the job already existed
    }

    /**
     * @method delete
     * @async
     * @description Deletes a job from the database.
     * @param {string} id - The ID of the job to delete.
     * @returns {Promise<void>}
     */
    async delete(id) {
        try {
            await this._JobModel.destroy({id});
        } catch (error) {
            logging.error(`Error deleting job ${id}:`, error);
        }
    }
}

module.exports = JobsRepository;