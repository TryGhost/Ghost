class DomainWarmingService {
    #emailModel;

    /**
     * @param {object} dependencies
     * @param {{Email: object}} dependencies.models
     */
    constructor(dependencies) {
        this.#emailModel = dependencies.models.Email;
    }

    async getLastCount() {
        // Find the most recent email (except today) and return the csd_count
        const email = await this.#emailModel.findOne({
            filter: `created_at:<${new Date().toISOString().split('T')[0]}`,
            order: 'created_at DESC'
        });

        if (!email) {
            return 0;
        }

        const count = email.get('csd_email_count');
        return count || 0;
    }

    async getWarmupLimit() {
        const lastCount = await this.getLastCount();

        if (lastCount <= 100) {
            return 200;
        } else if (lastCount <= 100_000) {
            return lastCount * 2;
        } else if (lastCount <= 400_000) {
            return lastCount * 1.5;
        } else {
            return lastCount * 1.25;
        }
    }
}

module.exports = DomainWarmingService;
