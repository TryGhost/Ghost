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
 * @typedef {object} milestonesConfig
 * @prop {Array<object>} milestonesConfig.arr
 * @prop {string} milestonesConfig.arr.currency
 * @prop {number[]} milestonesConfig.arr.values
 * @prop {number[]} milestonesConfig.members
 * @prop {number} milestonesConfig.maxPercentageFromMilestone
 * @prop {number} milestonesConfig.minDaysSinceLastEmail
 */

module.exports = class MilestonesService {
    /** @type {IMilestoneRepository} */
    #repository;

    /**
     * @type {milestonesConfig} */
    #milestonesConfig;

    /** @type {IQueries} */
    #queries;

    /**
     * @param {object} deps
     * @param {IMilestoneRepository} deps.repository
     * @param {milestonesConfig} deps.milestonesConfig
     * @param {IQueries} deps.queries
     */
    constructor(deps) {
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
     * @param {object} milestone.meta
     * @param {string|null} [milestone.currency]
     * @param {Date|null} [milestone.emailSentAt]
     *
     * @returns {Promise<Milestone>}
     */
    async #saveMileStoneAndSendEmail(milestone) {
        const {shouldSendEmail, reason} = await this.#shouldSendEmail(milestone);

        if (shouldSendEmail) {
            milestone.emailSentAt = new Date();
        }

        if (reason) {
            milestone.meta.reason = reason;
        }

        return await this.#createMilestone(milestone);
    }

    /**
     * @param {object} milestone
     * @param {number} milestone.value
     * @param {'arr'|'members'} milestone.type
     * @param {object} milestone.meta
     * @param {string|null} [milestone.currency]
     * @param {Date|null} [milestone.emailSentAt]
     *
     * @returns {Promise<{shouldSendEmail: boolean, reason: string}>}
     */
    async #shouldSendEmail(milestone) {
        let emailTooSoon = false;
        let emailTooClose = false;
        let reason = null;
        // Three cases in which we don't want to send an email
        // 1. There has been an import of members within the last week
        // 2. The last email has been sent less than two weeks ago
        // 3. The current members or ARR value is x% above the achieved milestone
        //    as defined in default shared config for `maxPercentageFromMilestone`
        const lastMilestoneSent = await this.#repository.getLastEmailSent();

        if (lastMilestoneSent) {
            const differenceInTime = new Date().getTime() - new Date(lastMilestoneSent.emailSentAt).getTime();
            const differenceInDays = differenceInTime / (1000 * 3600 * 24);

            emailTooSoon = differenceInDays <= this.#milestonesConfig.minDaysSinceLastEmail;
        }

        if (milestone?.meta) {
            // Check how much the value currently differs from the milestone
            const difference = milestone?.meta?.currentValue - milestone.value;
            const differenceInPercentage = difference / milestone.value;

            emailTooClose = differenceInPercentage >= this.#milestonesConfig.maxPercentageFromMilestone;
        }

        const hasMembersImported = await this.#queries.hasImportedMembersInPeriod();
        const shouldSendEmail = !emailTooSoon && !hasMembersImported && !emailTooClose;

        if (!shouldSendEmail) {
            reason = hasMembersImported ? 'import' :
                emailTooSoon ? 'email' : 'tooFar';
        }

        return {shouldSendEmail, reason};
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

                if (milestone && milestone > 0) {
                    // Fetch the latest milestone for this currency
                    const latestMilestone = await this.#getLatestArrMilestone(defaultCurrency);

                    // Ensure the milestone doesn't already exist
                    const milestoneExists = await this.#checkMilestoneExists({value: milestone, type: 'arr', currency: defaultCurrency});

                    if (!milestoneExists && (!latestMilestone || milestone > latestMilestone.value)) {
                        const meta = {
                            currentValue: currentARRForCurrency.arr
                        };
                        return await this.#saveMileStoneAndSendEmail({value: milestone, type: 'arr', currency: defaultCurrency, meta});
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

        if (milestone && milestone > 0) {
            // Fetch the latest achieved Members milestones
            const latestMembersMilestone = await this.#getLatestMembersCountMilestone();

            // Ensure the milestone doesn't already exist
            const milestoneExists = await this.#checkMilestoneExists({value: milestone, type: 'members', currency: null});

            if (!milestoneExists && (!latestMembersMilestone || milestone > latestMembersMilestone.value)) {
                const meta = {
                    currentValue: membersCount
                };
                return await this.#saveMileStoneAndSendEmail({value: milestone, type: 'members', meta});
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
