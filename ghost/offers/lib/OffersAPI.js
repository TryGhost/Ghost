const Offer = require('./Offer');
const OfferMapper = require('./OfferMapper');
const UniqueChecker = require('./UniqueChecker');

class OffersAPI {
    /**
     * @param {import('./OfferRepository')} repository
     */
    constructor(repository) {
        this.repository = repository;
    }

    /**
     * @param {object} data
     * @param {string} data.id
     *
     * @returns {Promise<OfferMapper.OfferDTO>}
     */
    async getOffer(data) {
        return this.repository.createTransaction(async (transaction) => {
            const options = {transacting: transaction};

            const offer = await this.repository.getById(data.id, options);

            return OfferMapper.toDTO(offer);
        });
    }

    /**
     * @param {object} data
     *
     * @returns {Promise<OfferMapper.OfferDTO>}
     */
    async createOffer(data) {
        return this.repository.createTransaction(async (transaction) => {
            const options = {transacting: transaction};
            const uniqueChecker = new UniqueChecker(this.repository, transaction);

            const offer = await Offer.create(data, uniqueChecker);

            await this.repository.save(offer, options);

            return OfferMapper.toDTO(offer);
        });
    }

    /**
     * @param {object} data
     * @param {string} data.id
     * @param {string} [data.name]
     * @param {string} [data.title]
     * @param {string} [data.description]
     * @param {string} [data.code]
     *
     * @returns {Promise<OfferMapper.OfferDTO>}
     */
    async updateOffer(data) {
        return await this.repository.createTransaction(async (transaction) => {
            const options = {transacting: transaction};
            const uniqueChecker = new UniqueChecker(this.repository, transaction);

            const offer = await this.repository.getById(data.id, options);

            if (data.name) {
                offer.updateName(data.name, uniqueChecker);
            }

            if (data.code) {
                offer.updateCode(data.code, uniqueChecker);
            }

            if (data.title) {
                offer.displayTitle = data.title;
            }

            if (data.description) {
                offer.displayDescription = data.description;
            }

            await this.repository.save(offer, options);

            transaction.commit();

            return OfferMapper.toDTO(offer);
        });
    }

    /**
     * @returns {Promise<OfferMapper.OfferDTO[]>}
     */
    async listOffers() {
        return await this.repository.createTransaction(async (transaction) => {
            const options = {transacting: transaction};

            const offers = await this.repository.getAll(options);

            return offers.map(OfferMapper.toDTO);
        });
    }
}

module.exports = OffersAPI;
