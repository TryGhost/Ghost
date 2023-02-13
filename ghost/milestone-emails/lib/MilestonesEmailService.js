const Milestone = require('./Milestone');

/**
 * @typedef {object} IMilestoneRepository
 * @prop {(milestone: Milestone) => Promise<void>} save
 * @prop {(arr: number, [currency]: string|null) => Promise<Milestone>} getByARR
 * @prop {(count: number) => Promise<Milestone>} getByCount
 * @prop {(type: 'arr'|'members', [currency]: string|null) => Promise<Milestone>} getLatestByType
 * @prop {() => Promise<Milestone>} getLastEmailSent
 */

/**
 * @typedef {object} IQueries
 * @prop {() => Promise<number>} getMembersCount
 * @prop {() => Promise<object>} getARR
 * @prop {() => Promise<boolean>} hasImportedMembersInPeriod
 * @prop {() => Promise<string>} getDefaultCurrency
 */

/**
 * @typedef {object} ghostMailer
 * @property {Function} send
 */

/**
 * @typedef {object} milestonesConfig
 * @prop {Array<object>} milestonesConfig.arr
 * @prop {string} milestonesConfig.arr.currency
 * @prop {number[]} milestonesConfig.arr.values
 * @prop {number[]} milestonesConfig.members
 */

module.exports = class MilestonesEmailService {
    /** @type {IMilestoneRepository} */
    #repository;

    /**
     * @type {ghostMailer} */
    #mailer;

    /**
     * @type {milestonesConfig} */
    #milestonesConfig;

    /** @type {IQueries} */
    #queries;

    /**
     * @param {object} deps
     * @param {ghostMailer} deps.mailer
     * @param {IMilestoneRepository} deps.repository
     * @param {milestonesConfig} deps.milestonesConfig
     * @param {IQueries} deps.queries
     */
    constructor(deps) {
        this.#mailer = deps.mailer;
        this.#milestonesConfig = deps.milestonesConfig;
        this.#queries = deps.queries;
        this.#repository = deps.repository;
    }

    /**
     * @param {string} [currency]
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
        return this.#repository.getLatestByType('members', null);
    }

    /**
     * @returns {Promise<string>}
     */
    async #getDefaultCurrency() {
        return await this.#queries.getDefaultCurrency();
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
            existingMilestone = await this.#repository.getByARR(milestone.value, milestone.currency) || false;
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
     * @param {number[]} goalValues
     * @param {number} current
     *
     * @returns {number}
     */
    #getMatchedMilestone(goalValues, current) {
        // return highest suitable milestone
        return goalValues.filter(value => current >= value)
            .sort((a, b) => b - a)[0];
    }

    /**
     *
     * @param {object} milestone
     * @param {number} milestone.value
     * @param {'arr'|'members'} milestone.type
     * @param {string|null} [milestone.currency]
     * @param {Date|null} [milestone.emailSentAt]
     *
     * @returns {Promise<Milestone>}
     */
    async #saveMileStoneAndSendEmail(milestone) {
        const shouldSendEmail = await this.#shouldSendEmail();

        if (shouldSendEmail) {
            // TODO: hook up Ghostmailer or use StaffService and trigger event to send email
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
        const defaultCurrency = await this.#getDefaultCurrency();

        // Check the definitions in the milestonesConfig
        const arrMilestoneSettings = this.#milestonesConfig.arr;
        const supportedCurrencies = arrMilestoneSettings.map(setting => setting.currency);

        // First check the currency matches
        if (currentARR.length) {
            let milestone;

            const currentARRForCurrency = currentARR.filter(arr => arr.currency === defaultCurrency && supportedCurrencies.includes(defaultCurrency))[0];
            const milestonesForCurrency = arrMilestoneSettings.filter(milestoneSetting => milestoneSetting.currency === defaultCurrency)[0];

            if (milestonesForCurrency && currentARRForCurrency) {
                // get the closest milestone we're over now
                milestone = this.#getMatchedMilestone(milestonesForCurrency.values, currentARRForCurrency.arr);

                // Fetch the latest milestone for this currency
                const latestMilestone = await this.#getLatestArrMilestone(defaultCurrency);

                // Ensure the milestone doesn't already exist
                const milestoneExists = await this.#checkMilestoneExists({value: milestone, type: 'arr', currency: defaultCurrency});

                if (milestone && milestone > 0) {
                    if (!milestoneExists && (!latestMilestone || milestone > latestMilestone.value)) {
                        return await this.#saveMileStoneAndSendEmail({value: milestone, type: 'arr', currency: defaultCurrency});
                    }
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

        // Check the definitions in the milestonesConfig
        const membersMilestones = this.#milestonesConfig.members;

        // get the closest milestone we're over now
        let milestone = this.#getMatchedMilestone(membersMilestones, membersCount);

        // Fetch the latest achieved Members milestones
        const latestMembersMilestone = await this.#getLatestMembersCountMilestone();

        // Ensure the milestone doesn't already exist
        const milestoneExists = await this.#checkMilestoneExists({value: milestone, type: 'members', currency: null});

        if (milestone && milestone > 0) {
            if (!milestoneExists && (!latestMembersMilestone || milestone > latestMembersMilestone.value)) {
                return await this.#saveMileStoneAndSendEmail({value: milestone, type: 'members'});
            }
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
