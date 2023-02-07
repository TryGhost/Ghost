/**
 * @typedef {import('./MilestonesAPI')} MilestonesAPI
 * @typedef {import('./Milestone')} Milestone
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
    /** @type {import('./MilestonesAPI')} */
    #api;

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
        this.#api = deps.api;
        this.#config = deps.config;
        this.#queries = deps.queries;
        this.#defaultCurrency = deps.defaultCurrency;
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
        const milestoneData = {
            type: milestone.type,
            value: milestone.value
        };

        if (milestone.type === 'arr') {
            milestoneData.currency = this.#defaultCurrency;
        }

        const shouldSendEmail = await this.#shouldSendEmail();

        if (shouldSendEmail) {
            // TODO: hook up GhostMailer or use StaffService and trigger event to send email
            // await this.#mailer.send({
            //     subject: 'Test',
            //     html: '<div>Milestone achieved</div>',
            //     to: 'test@example.com'
            // });

            milestoneData.emailSentAt = new Date();
        }

        const savedMilestone = await this.#api.checkAndProcessMilestone(milestoneData);

        return savedMilestone;
    }

    /**
     *
     * @returns {Promise<boolean>}
     */
    async #shouldSendEmail() {
        // Two cases in which we don't want to send an email
        // 1. There has been an import of members within the last week
        // 2. The last email has been sent less than two weeks ago
        const hasMembersImported = await this.#queries.hasImportedMembersInPeriod();
        const shouldSendEmail = await this.#api.shouldSendEmail();

        return shouldSendEmail && !hasMembersImported;
    }

    async runARRQueries() {
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
                const latestMilestone = await this.#api.getLatestArrMilestone(this.#defaultCurrency);

                if (!latestMilestone || milestone > latestMilestone.value) {
                    return await this.#saveMileStoneAndSendEmail({value: milestone, type: 'arr'});
                }
            }
        }
    }

    async runMemberQueries() {
        // Fetch the current data
        const membersCount = await this.#queries.getMembersCount();

        // Check the definitions in the config
        const membersMilestones = this.#config.milestones.members;

        // get the closest milestone we're over now
        const milestone = this.#getMatchedMilestone(membersMilestones, membersCount);

        // Fetch the latest achieved Members milestones
        const latestMembersMilestone = await this.#api.getLatestMembersCountMilestone();

        if (!latestMembersMilestone || milestone > latestMembersMilestone?.value) {
            return await this.#saveMileStoneAndSendEmail({value: milestone, type: 'members'});
        }
    }
};
