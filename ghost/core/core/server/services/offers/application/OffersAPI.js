const Offer = require('../domain/models/Offer');
const OfferName = require('../domain/models/OfferName');
const OfferCode = require('../domain/models/OfferCode');
const OfferTitle = require('../domain/models/OfferTitle');
const OfferDescription = require('../domain/models/OfferDescription');
const OfferStatus = require('../domain/models/OfferStatus');
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

            if (!offer) {
                return null;
            }

            return OfferMapper.toDTO(offer);
        });
    }

    /**
     * @param {any} data
     * @param {Object} [options]
     *
     * @returns {Promise<OfferMapper.OfferDTO>}
     */
    async createOffer(data, options = {}) {
        return this.repository.createTransaction(async (transaction) => {
            const saveOptions = {...options, transacting: transaction};
            const uniqueChecker = new UniqueChecker(this.repository, transaction);

            const offer = await Offer.create(data, uniqueChecker);

            await this.repository.save(offer, saveOptions);

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
     * @param {string} [data.status]
     * @param {Object} [options]
     *
     * @returns {Promise<OfferMapper.OfferDTO>}
     */
    async updateOffer(data, options = {}) {
        return await this.repository.createTransaction(async (transaction) => {
            const updateOptions = {...options, transacting: transaction};
            const uniqueChecker = new UniqueChecker(this.repository, transaction);

            const offer = await this.repository.getById(data.id, updateOptions);

            if (!offer) {
                return null;
            }

            if (Reflect.has(data, 'name')) {
                const name = OfferName.create(data.name);
                await offer.updateName(name, uniqueChecker);
            }

            if (Reflect.has(data, 'code')) {
                const code = OfferCode.create(data.code);
                await offer.updateCode(code, uniqueChecker);
            }

            if (Reflect.has(data, 'display_title')) {
                const title = OfferTitle.create(data.display_title);
                offer.displayTitle = title;
            }

            if (Reflect.has(data, 'display_description')) {
                const description = OfferDescription.create(data.display_description);
                offer.displayDescription = description;
            }

            if (Reflect.has(data, 'status')) {
                const status = OfferStatus.create(data.status);
                offer.status = status;
            }

            await this.repository.save(offer, updateOptions);

            return OfferMapper.toDTO(offer);
        });
    }

    /**
     * @param {object} options
     * @param {string} options.filter
     * @returns {Promise<OfferMapper.OfferDTO[]>}
     */
    async listOffers(options) {
        return await this.repository.createTransaction(async (transaction) => {
            const opts = {transacting: transaction, filter: options.filter};

            const offers = await this.repository.getAll(opts);

            return offers.map(OfferMapper.toDTO);
        });
    }
}

module.exports = OffersAPI;
