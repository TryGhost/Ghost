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