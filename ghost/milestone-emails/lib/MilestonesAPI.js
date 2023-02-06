const errors = require('@tryghost/errors');
const Milestone = require('./Milestone');

/**
 * @template Model
 * @typedef {object} Mention<Model>
 * @prop {Model[]} data
 */

/**
 * @typedef {object} IMilestoneRepository
 * @prop {(milestone: Milestone) => Promise<void>} save
 * @prop {(arr: number) => Promise<Milestone>} getByARR
 * @prop {(count: number) => Promise<Milestone>} getByCount
 * @prop {(type: 'arr'|'members') => Promise<Milestone>} getLatestByType
 * @prop {() => Promise<Milestone>} getLastEmailSent
 */

module.exports = class MilestonesAPI {
    /** @type {IMilestoneRepository} */
    #repository;

    constructor(deps) {
        this.#repository = deps.repository;
    }

    /**
     * @param {string|null} currency
     *
     * @returns {Promise<Milestone>}
     */
    async getLatestArrMilestone(currency = 'usd') {
        return this.#repository.getLatestByType('arr', currency);
    }

    /**
     * @returns {Promise<Milestone>}
     */
    async getLatestMembersCountMilestone() {
        return this.#repository.getLatestByType('members');
    }

    /**
     * @param {object} milestone
     * @param {'arr'|'members'} milestone.type
     * @param {number} milestone.value
     * @param {string} milestone.currency
     *
     * @returns {Promise<boolean>}
     */
    async checkMilestoneExists(milestone) {
        let foundExistingMilestone = false;
        let existingMilestone = null;

        if (milestone.type === 'arr') {
            existingMilestone = await this.#repository.getByARR(milestone.value, milestone?.currency) || false;
        } else if (milestone.type === 'members') {
            existingMilestone = await this.#repository.getByCount(milestone.value) || false;
        }

        foundExistingMilestone = existingMilestone ? true : false;
        return foundExistingMilestone;
    }

    /**
     * @param {object} milestone
     * @param {'arr'|'members'} milestone.type
     * @param {number} milestone.value
     *
     * @returns {Promise<Milestone>}
     */
    async checkAndProcessMilestone(milestone) {
        const milestoneExists = await this.checkMilestoneExists(milestone);

        if (milestoneExists) {
            const milestoneName = milestone.type === 'arr'
                ? `${milestone.type}-${milestone.value}-${milestone.currency}`
                : `${milestone.type}-${milestone.value}`;

            throw new errors.ValidationError({
                message: `Milestone ${milestoneName} already exists`
            });
        }

        const newMilestone = await Milestone.create(milestone);

        await this.#repository.save(newMilestone);

        return newMilestone;
    }

    /**
     *
     * @returns {Promise<boolean>}
     */
    async shouldSendEmail() {
        // check the date of the last sent email.
        // There should be at least two weeks in between sending another one
        const lastMilestoneSent = await this.#repository.getLastEmailSent();

        if (!lastMilestoneSent) {
            return true;
        }

        const differenceInTime = new Date().getTime() - new Date(lastMilestoneSent.emailSentAt).getTime();
        const differenceInDays = differenceInTime / (1000 * 3600 * 24);

        return differenceInDays >= 14;
    }
};
