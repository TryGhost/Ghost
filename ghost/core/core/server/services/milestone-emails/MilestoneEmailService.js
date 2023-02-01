/**
 * @typedef {import('@tryghost/milestone-emails/lib/milestone-emails').MilestonesAPI} MilestonesAPI
 * @typedef {import('@tryghost/milestone-emails/lib/milestone-emails').Milestone} Milestone
 */

/**
 * @template Model
 * @typedef {import('@tryghost/milestone-emails/lib/MilestonesAPI')} <Model>
 */

/**
 * @typedef {object} IJobService
 * @prop {(name: string, fn: Function) => void} addJob
 */

/**
 * @typedef {object} IGhostMailer
 * @prop {(name: string, fn: Function) => void} send
 */

module.exports = class MilestoneEmailService {
    /** @type {import('@tryghost/milestone-emails/lib/MilestonesAPI')} */
    #api;

    /** @type {IJobService} */
    #jobService;

    /** @type {IGhostMailer} */
    #mailer;

    /** @type {Object} */
    #config;

    /**
     * @param {object} deps
     * @param {IGhostMailer} deps.mailer
     * @param {IJobService} deps.jobService
     * @param {MilestonesAPI} deps.api
     * @param {Object} deps.config
     */
    async init(deps) {
        this.#mailer = deps.mailer;
        this.#jobService = deps.jobService;
        this.#api = deps.api;
        this.#config = deps.config;
    }
};
