/**
 * @typedef {import('../../../shared/labs')} LabsService
 */

class DomainWarmingService {
    #emailModel;
    #labs;

    /**
     * @param {object} dependencies
     * @param {{Email: object}} dependencies.models
     * @param {LabsService} dependencies.labs
     */
    constructor({models, labs}) {
        this.#emailModel = models.Email;
        this.#labs = labs;
    }

    /**
     *
     * @returns {boolean} Whether the domain warming feature is enabled
     */
    isEnabled() {
        return this.#labs.isSet('domainWarmup');
    }

    /**
     * Get the maximum amount of emails that should be sent from the warming sending domain in today's newsletter
     * @param {number} emailCount The total number of emails to be sent in this newsletter
     * @returns {Promise<number>} The number of emails that should be sent from the warming sending domain (remaining emails to be sent from fallback domain)
     */
    async getWarmupLimit(emailCount) {
        const lastCount = await this.#getHighestCount();

        return Math.min(emailCount, this.#getTargetLimit(lastCount));
    }

    /**
     *
     * @returns {Promise<number>} The highest number of messages sent from the CSD in a single email (excluding today)
     */
    async #getHighestCount() {
        const email = await this.#emailModel.findOne({
            filter: `created_at:<${new Date().toISOString().split('T')[0]}`,
            order: 'csd_email_count DESC'
        });

        if (!email) {
            return 0;
        }

        const count = email.get('csd_email_count');
        return count || 0;
    }

    /**
     *
     * @param {number} lastCount Highest number of messages sent from the CSD in a single email
     * @returns {number} The limit for sending from the warming sending domain for the next email
     */
    #getTargetLimit(lastCount) {
        if (lastCount <= 100) {
            return 200;
        } else if (lastCount <= 100_000) {
            return lastCount * 2;
        } else if (lastCount <= 400_000) {
            return Math.ceil(lastCount * 1.5);
        } else {
            return Math.ceil(lastCount * 1.25);
        }
    }
}

module.exports = DomainWarmingService;
