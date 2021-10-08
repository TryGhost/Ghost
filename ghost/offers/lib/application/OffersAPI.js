const Offer = require('../domain/models/Offer');
const OfferName = require('../domain/models/OfferName');
const OfferCode = require('../domain/models/OfferCode');
const OfferTitle = require('../domain/models/OfferTitle');
const OfferDescription = require('../domain/models/OfferDescription');
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
     * @param {string} [data.display_title]
     * @param {string} [data.display_description]
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
                const name = OfferName.create(data.name);
                await offer.updateName(name, uniqueChecker);
            }

            if (data.code) {
                const code = OfferCode.create(data.code);
                await offer.updateCode(code, uniqueChecker);
            }

            if (data.display_title) {
                const title = OfferTitle.create(data.display_title);
                offer.displayTitle = title;
            }

            if (data.display_description) {
                const description = OfferDescription.create(data.display_description);
                offer.displayDescription = description;
            }

            await this.repository.save(offer, options);

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
