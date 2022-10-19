const ObjectID = require('bson-objectid').default;
const {BadRequestError} = require('@tryghost/errors');
const Tier = require('./Tier');
const TierSlugService = require('./TierSlugService');

/**
 * @typedef {object} ITierRepository
 * @prop {(id: ObjectID) => Promise<Tier>} getById
 * @prop {(slug: string) => Promise<Tier>} getBySlug
 * @prop {(tier: Tier) => Promise<void>} save
 * @prop {(options?: {filter?: string}) => Promise<Tier[]>} getAll
 */

/**
 * @template {Model}
 * @typedef {object} Page<Model>
 * @prop {Model[]} data
 * @prop {object} meta
 * @prop {object} meta.pagination
 * @prop {number} meta.pagination.page - The current page
 * @prop {number} meta.pagination.pages - The total number of pages
 * @prop {number} meta.pagination.limit - The limit of models per page
 * @prop {number} meta.pagination.total - The totaL number of models across all pages
 * @prop {number|null} meta.pagination.prev - The number of the previous page, or null if there isn't one
 * @prop {number|null} meta.pagination.next - The number of the next page, or null if there isn't one
 */

module.exports = class TiersAPI {
    /** @type {ITierRepository} */
    #repository;

    /** @type {TierSlugService} */
    #slugService;

    constructor(deps) {
        this.#repository = deps.repository;
        this.#slugService = new TierSlugService({
            repository: deps.repository
        });
    }

    /**
     * @param {object} [options]
     * @param {string} [options.filter] - An NQL filter string
     *
     * @returns {Promise<Page<Tier>>}
     */
    async browse(options = {}) {
        const tiers = await this.#repository.getAll(options);

        return {
            data: tiers,
            meta: {
                pagination: {
                    page: 1,
                    pages: 1,
                    limit: tiers.length,
                    total: tiers.length,
                    prev: null,
                    next: null
                }
            }
        };
    }

    /**
     * @param {string} idString
     *
     * @returns {Promise<Tier>}
     */
    async read(idString) {
        const id = ObjectID.createFromHexString(idString);
        const tier = await this.#repository.getById(id);

        return tier;
    }

    /**
     * @param {string} id
     * @param {object} data
     * @returns {Promise<Tier>}
     */
    async edit(id, data) {
        const tier = await this.#repository.getById(id);

        const editableProperties = [
            'name',
            'benefits',
            'description',
            'visibility',
            'active',
            'trial_days',
            'currency',
            'monthly_price',
            'yearly_price'
        ];

        for (const editableProperty of editableProperties) {
            if (Reflect.has(data, editableProperty)) {
                tier[editableProperty] = data[editableProperty];
            }
        }

        await this.#repository.save(tier);

        return tier;
    }

    /**
     * @param {object} data
     * @returns {Promise<Tier>}
     */
    async add(data) {
        if (data.type !== 'paid') {
            throw new BadRequestError({
                message: 'Cannot create free Tier'
            });
        }
        const tier = await Tier.create({
            type: 'paid',
            status: 'active',
            visibility: data.visibility,
            name: data.name,
            description: data.description,
            benefits: data.benefits,
            welcome_page_url: data.welcome_page_url,
            monthly_price: data.monthly_price,
            yearly_price: data.yearly_price,
            currency: data.currency,
            trial_days: data.trial_days
        }, this.#slugService);

        await this.#repository.save(tier);

        return tier;
    }
};
