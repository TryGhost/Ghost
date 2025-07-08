const Milestone = require('./Milestone');

/**
 * @typedef {object} IMilestoneRepository
 * @prop {(milestone: Milestone) => Promise<void>} save
 * @prop {(arr: number, [currency]: string|null) => Promise<Milestone>} getByARR
 * @prop {(count: number) => Promise<Milestone>} getByCount
 * @prop {(type: 'arr'|'members', [currency]: string|null) => Promise<Milestone>} getLatestByType
 * @prop {() => Promise<Milestone>} getLastEmailSent
 * @prop {(type: 'arr'|'members', [currency]: string|null) => Promise<Milestone[]>} getAllByType
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
     * @returns {number[]}
     */
    #getMatchedMilestones(goalValues, current) {
        // return all achieved milestones and sort by value ascending
        return goalValues.filter(value => current >= value)
            .sort((a, b) => a - b);
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
        const {shouldSendEmail, reason} = await this.#shouldSendEmail();

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
     * @returns {Promise<Milestone>}
     */
    async #saveMileStoneWithoutEmail(milestone) {
        return await this.#createMilestone(milestone);
    }

    /**
     * @returns {Promise<{shouldSendEmail: boolean, reason: string}>}
     */
    async #shouldSendEmail() {
        let emailTooSoon = false;
        let reason = null;
        // Two cases in which we don't want to send an email
        // 1. There has been an import of members within the last week
        // 2. The last email has been sent less than two weeks ago
        const lastMilestoneSent = await this.#repository.getLastEmailSent();

        if (lastMilestoneSent) {
            const differenceInTime = new Date().getTime() - new Date(lastMilestoneSent.emailSentAt).getTime();
            const differenceInDays = differenceInTime / (1000 * 3600 * 24);

            emailTooSoon = differenceInDays <= this.#milestonesConfig.minDaysSinceLastEmail;
        }

        const hasMembersImported = await this.#queries.hasImportedMembersInPeriod();
        const shouldSendEmail = !emailTooSoon && !hasMembersImported;

        if (!shouldSendEmail) {
            reason = hasMembersImported ? 'import' : 'email';
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
            const currentARRForCurrency = currentARR.filter(arr => arr.currency === defaultCurrency && supportedCurrencies.includes(defaultCurrency))[0];
            const milestonesForCurrency = arrMilestoneSettings.filter(milestoneSetting => milestoneSetting.currency === defaultCurrency)[0];

            if (milestonesForCurrency && currentARRForCurrency) {
                // get all milestones that have been achieved
                const achievedMilestones = this.#getMatchedMilestones(milestonesForCurrency.values, currentARRForCurrency.arr);

                // check for previously achieved milestones. We do not send an email when no
                // previous milestones exist
                const allMilestonesForCurrency = await this.#repository.getAllByType('arr', defaultCurrency);
                const isInitialRun = !allMilestonesForCurrency || allMilestonesForCurrency?.length === 0;
                const highestAchievedMilestone = Math.max(...achievedMilestones);

                if (achievedMilestones && achievedMilestones.length) {
                    for await (const milestone of achievedMilestones) {
                        // Fetch the latest milestone for this currency
                        const latestMilestone = await this.#getLatestArrMilestone(defaultCurrency);

                        // Ensure the milestone doesn't already exist
                        const milestoneExists = await this.#checkMilestoneExists({value: milestone, type: 'arr', currency: defaultCurrency});

                        if (!milestoneExists) {
                            if (isInitialRun) {
                                // No milestones have been saved yet, don't send an email
                                // for the first initial run
                                const meta = {
                                    currentValue: currentARRForCurrency.arr,
                                    reason: 'initial'
                                };
                                await this.#saveMileStoneWithoutEmail({value: milestone, type: 'arr', currency: defaultCurrency, meta});
                            } else if ((latestMilestone && milestone <= latestMilestone?.value) || milestone < highestAchievedMilestone) {
                                // The highest achieved milestone is higher than the current on hand.
                                // Do not send an email, but save it.
                                const meta = {
                                    currentValue: currentARRForCurrency.arr,
                                    reason: 'skipped'
                                };
                                await this.#saveMileStoneWithoutEmail({value: milestone, type: 'arr', currency: defaultCurrency, meta});
                            } else if ((!latestMilestone || milestone > latestMilestone.value)) {
                                const meta = {
                                    currentValue: currentARRForCurrency.arr
                                };
                                await this.#saveMileStoneAndSendEmail({value: milestone, type: 'arr', currency: defaultCurrency, meta});
                            }
                        }
                    }
                }
                return await this.#getLatestArrMilestone(defaultCurrency);
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
        let achievedMilestones = this.#getMatchedMilestones(membersMilestones, membersCount);

        // check for previously achieved milestones. We do not send an email when no
        // previous milestones exist
        const allMembersMilestones = await this.#repository.getAllByType('members', null);
        const isInitialRun = !allMembersMilestones || allMembersMilestones?.length === 0;
        const highestAchievedMilestone = Math.max(...achievedMilestones);

        if (achievedMilestones && achievedMilestones.length) {
            for await (const milestone of achievedMilestones) {
                // Fetch the latest achieved Members milestones
                const latestMembersMilestone = await this.#getLatestMembersCountMilestone();

                // Ensure the milestone doesn't already exist
                const milestoneExists = await this.#checkMilestoneExists({value: milestone, type: 'members', currency: null});

                if (!milestoneExists) {
                    if (isInitialRun) {
                        // No milestones have been saved yet, don't send an email
                        // for the first initial run
                        const meta = {
                            currentValue: membersCount,
                            reason: 'initial'
                        };
                        await this.#saveMileStoneWithoutEmail({value: milestone, type: 'members', meta});
                    } else if ((latestMembersMilestone && milestone <= latestMembersMilestone?.value) || milestone < highestAchievedMilestone) {
                        // The highest achieved milestone is higher than the current on hand.
                        // Do not send an email, but save it.
                        const meta = {
                            currentValue: membersCount,
                            reason: 'skipped'
                        };
                        await this.#saveMileStoneWithoutEmail({value: milestone, type: 'members', meta});
                    } else if ((!latestMembersMilestone || milestone > latestMembersMilestone.value)) {
                        const meta = {
                            currentValue: membersCount
                        };
                        await this.#saveMileStoneAndSendEmail({value: milestone, type: 'members', meta});
                    }
                }
            }
            return await this.#getLatestMembersCountMilestone();
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
