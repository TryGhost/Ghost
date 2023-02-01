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
    #mailer;

    /**
     * @param {object} deps
     * @param {IGhostMailer} deps.mailer
     * @param {IJobService} deps.jobService
     */
    async init(deps) {
        this.#mailer = deps.mailer;
        this.#jobService = deps.jobService;
    }
};
