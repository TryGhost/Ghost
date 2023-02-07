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

/**
 * @template Model
 * @typedef {import('./MilestonesAPI')} <Model>
 */

/**
 * @typedef {Object} IQueries
 * @prop {() => Promise<number>} getMembersCount
 * @prop {() => Promise<Object>} getARR
 * @prop {() => Promise<boolean>} hasImportedMembersInPeriod
 */

module.exports = class MilestonesEmailService {
    /** @type {IMilestoneRepository} */
    #repository;

    /** @type {Function} */
    #mailer;

    /** @type {Object} */
    #config;

    /** @type {IQueries} */
    #queries;

    /** @type {string} */
    #defaultCurrency;

    /**
     * @param {object} deps
     * @param {Function} deps.mailer
     * @param {MilestonesAPI} deps.api
     * @param {Object} deps.config
     * @param {IQueries} deps.queries
     * @param {string} deps.defaultCurrency
     */
    constructor(deps) {
        this.#mailer = deps.mailer;
        this.#config = deps.config;
        this.#queries = deps.queries;
        this.#defaultCurrency = deps.defaultCurrency;
        this.#repository = deps.repository;
    }

    /**
     * @param {string|null} currency
     *
     * @returns {Promise<Milestone>}
     */
    async #getLatestArrMilestone(currency = 'usd') {
        return this.#repository.getLatestByType('arr', currency);
    }

    /**
     * @returns {Promise<Milestone>}
     */
    async #getLatestMembersCountMilestone() {
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
    async #checkMilestoneExists(milestone) {
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
    async #createMilestone(milestone) {
        const newMilestone = await Milestone.create(milestone);

        await this.#repository.save(newMilestone);

        return newMilestone;
    }

    /**
     *
     * @param {Array} goalValues
     * @param {number} current
     *
     * @returns {Array}
     */
    #getMatchedMilestone(goalValues, current) {
        // return highest suitable milestone
        return goalValues.filter(value => current >= value)
            .sort((a, b) => b - a)[0];
    }

    /**
     *
     * @param {Object} milestone
     * @param {number} milestone.value
     * @param {'arr'|'members'} milestone.type
     * @param {boolean} hasMembersImported
     *
     * @returns {Promise<Milestone>}
     */
    async #saveMileStoneAndSendEmail(milestone) {
        if (milestone.type === 'arr') {
            milestone.currency = this.#defaultCurrency;
        }

        const shouldSendEmail = await this.#shouldSendEmail();

        if (shouldSendEmail) {
            // TODO: hook up GhostMailer or use StaffService and trigger event to send email
            // await this.#mailer.send({
            //     subject: 'Test',
            //     html: '<div>Milestone achieved</div>',
            //     to: 'test@example.com'
            // });

            milestone.emailSentAt = new Date();
        }

        return await this.#createMilestone(milestone);
    }

    /**
     *
     * @returns {Promise<boolean>}
     */
    async #shouldSendEmail() {
        let shouldSendEmail;
        // Two cases in which we don't want to send an email
        // 1. There has been an import of members within the last week
        // 2. The last email has been sent less than two weeks ago
        const lastMilestoneSent = await this.#repository.getLastEmailSent();

        if (!lastMilestoneSent) {
            shouldSendEmail = true;
        } else {
            const differenceInTime = new Date().getTime() - new Date(lastMilestoneSent.emailSentAt).getTime();
            const differenceInDays = differenceInTime / (1000 * 3600 * 24);

            shouldSendEmail = differenceInDays >= 14;
        }

        const hasMembersImported = await this.#queries.hasImportedMembersInPeriod();

        return shouldSendEmail && !hasMembersImported;
    }

    /**
     * @returns {Promise<Milestone>}
    */
    async #runARRQueries() {
        // Fetch the current data from queries
        const currentARR = await this.#queries.getARR();

        // Check the definitions in the config
        const arrMilestoneSettings = this.#config.milestones.arr;

        // First check the currency matches
        if (currentARR.length) {
            let milestone;

            const currentARRForCurrency = currentARR.filter(arr => arr.currency === this.#defaultCurrency)[0];
            const milestonesForCurrency = arrMilestoneSettings.filter(milestoneSetting => milestoneSetting.currency === this.#defaultCurrency)[0];

            if (milestonesForCurrency && currentARRForCurrency) {
                // get the closest milestone we're over now
                milestone = this.#getMatchedMilestone(milestonesForCurrency.values, currentARRForCurrency.arr);

                // Fetch the latest milestone for this currency
                const latestMilestone = await this.#getLatestArrMilestone(this.#defaultCurrency);

                // Ensure the milestone doesn't already exist
                const milestoneExists = await this.#checkMilestoneExists({value: milestone, type: 'arr', currency: this.#defaultCurrency});

                if ((!milestoneExists && !latestMilestone || milestone > latestMilestone.value)) {
                    return await this.#saveMileStoneAndSendEmail({value: milestone, type: 'arr'});
                }
            }
        }
    }

    /**
     * @returns {Promise<Milestone>}
    */
    async #runMemberQueries() {
        // Fetch the current data
        const membersCount = await this.#queries.getMembersCount();

        // Check the definitions in the config
        const membersMilestones = this.#config.milestones.members;

        // get the closest milestone we're over now
        const milestone = this.#getMatchedMilestone(membersMilestones, membersCount);

        // Fetch the latest achieved Members milestones
        const latestMembersMilestone = await this.#getLatestMembersCountMilestone();

        // Ensure the milestone doesn't already exist
        const milestoneExists = await this.#checkMilestoneExists({value: milestone, type: 'members'});

        if ((!milestoneExists && !latestMembersMilestone || milestone > latestMembersMilestone.value)) {
            return await this.#saveMileStoneAndSendEmail({value: milestone, type: 'members'});
        }
    }

    /**
     * @param {'arr'|'members'} type
     *
     * @returns {Promise<Milestone>}
    */
    async checkMilestones(type) {
        if (type === 'arr') {
            return await this.#runARRQueries();
        }

        return await this.#runMemberQueries();
    }
};
