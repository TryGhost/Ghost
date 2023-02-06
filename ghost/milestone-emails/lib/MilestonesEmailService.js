/**
 * @typedef {import('./MilestonesAPI')} MilestonesAPI
 * @typedef {import('./Milestone')} Milestone
 */

/**
 * @template Model
 * @typedef {import('./MilestonesAPI')} <Model>
 */

/**
 * @typedef {object} IQueries
 * @prop {() => Promise<number>} getMembersCount
 * @prop {() => Promise<Object>} getARR
 * @prop {() => Promise<boolean>} hasImportedMembersInPeriod
 */

module.exports = class MilestonesEmailService {
    /** @type {import('./MilestonesAPI')} */
    #api;

    /** @type {Function} */
    #sendEmail;

    /** @type {Object} */
    #config;

    /** @type {IQueries} */
    #queries;

    /** @type {boolean} */
    #isEnabled;

    /**
     * @param {object} deps
     * @param {Function} deps.sendEmail
     * @param {MilestonesAPI} deps.api
     * @param {Object} deps.config
     * @param {IQueries} deps.queries
     */
    async init(deps) {
        this.#sendEmail = deps.sendEmail;
        this.#api = deps.api;
        this.#config = deps.config;
        this.#queries = deps.queries;
    }

    async runQueries() {
        // const matchingCurrencies = [];
        // TODO: do we need to check if Stripe is live enabled?
        // Fetch the current data
        // const membersCount = await this.#queries.getMembersCount();
        // const currentARR = await this.#queries.getARR();
        // const hasMembersImported = await this.#queries.hasImportedMembersInPeriod();

        // // Check the definitions in the config
        // const definedMilestones = this.#config.milestones;
        // const arrMilestoneSettings = definedMilestones.arr;
        // const membersMilestones = definedMilestones.members;

        // // Fetch the latest achieved milestones
        // const latestMembersMilestone = await this.#api.getLatestMembersCountMilestone();
        // const latestARRMilestone = await this.#api.getLatestArrMilestone();

        // // Now the logic
        // // First check the currency matches
        // arrMilestoneSettings.forEach(({currency}) => {
        //     // see if the requested currency is used and returned from current ARR result
        //     const filteredResults = currentARR.filter(({currency: curr}) => currency === curr);

        //     if (filteredResults.length) {
        //         matchingCurrencies.push(filteredResults);
        //     }
        // });

        // if (matchingCurrencies.length) {
        //     // now if we hit
        // }
    }
};
