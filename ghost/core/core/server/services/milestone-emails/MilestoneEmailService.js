/**
 * @typedef {object} IJobService
 * @prop {(name: string, fn: Function) => void} addJob
 */

/**
 * @typedef {object} IGhostMailer
 * @prop {(name: string, fn: Function) => void} send
 */

module.exports = class MilestoneEmailService {
    /** @type {IJobService} */
    #jobService;

    /** @type {IGhostMailer} */
    #provider;

    /**
     * @param {object} deps
     * @param {IGhostMailer} deps.provider
     * @param {IJobService} deps.jobService
     */
    async init(deps) {
        this.#provider = deps.provider;
        this.#jobService = deps.jobService;
    }
};
