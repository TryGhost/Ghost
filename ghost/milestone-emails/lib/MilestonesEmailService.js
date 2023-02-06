/**
 * @typedef {import('./MilestonesAPI')} MilestonesAPI
 * @typedef {import('./Milestone')} Milestone
 */

/**
 * @template Model
 * @typedef {import('./MilestonesAPI')} <Model>
 */

/**
 * @typedef {import('./MilestoneQueries')} IQueries
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

    /** @type {import('./MilestoneQueries')} */
    #queries;

    /**
     * @param {object} deps
     * @param {Function} deps.mailer
     * @param {MilestonesAPI} deps.api
     * @param {Object} deps.config
     * @param {IQueries} deps.queries
     */
    async init(deps) {
        this.#mailer = deps.mailer;
        this.#api = deps.api;
        this.#config = deps.config;
        this.#queries = deps.queries;
    }

    async runARRQueries() {
        const matchingCurrencies = [];
        // TODO: do we need to check if Stripe is live enabled?
        // Fetch the current data
        const currentARR = await this.#queries.getARR();
        // const hasMembersImported = await this.#queries.hasImportedMembersInPeriod();

        // Check the definitions in the config
        const definedMilestones = this.#config.milestones;
        const arrMilestoneSettings = definedMilestones.arr;

        // Fetch the latest achieved milestones
        // const latestARRMilestone = await this.#api.getLatestArrMilestone();

        // Now the logic
        // First check the currency matches
        if (currentARR.length) {
            arrMilestoneSettings.forEach(({currency}) => {
                // see if the requested currency is used and returned from current ARR result
                const filteredResults = currentARR.filter(({currency: curr}) => currency === curr);

                if (filteredResults.length) {
                    matchingCurrencies.push(filteredResults);
                }
            });

            // if (matchingCurrencies.length) {
            //     // now if we hit
            //     console.log(latestARRMilestone);
            // }
        }
    }

    async runMemberQueries() {
        // // Fetch the current data
        // const membersCount = await this.#queries.getMembersCount();
        // const hasMembersImported = await this.#queries.hasImportedMembersInPeriod();

        // // Check the definitions in the config
        // const definedMilestones = this.#config.milestones;
        // const membersMilestones = definedMilestones.members;

        // // Fetch the latest achieved milestones
        // const latestMembersMilestone = await this.#api.getLatestMembersCountMilestone();
    }
};
