const ObjectID = require('bson-objectid').default;
const {BadRequestError, IncorrectUsageError} = require('@tryghost/errors');
const Tier = require('./tier');

/**
 * @typedef {object} ITierRepository
 * @prop {(id: ObjectID) => Promise<Tier>} getById
 * @prop {(tier: Tier) => Promise<void>} save
 * @prop {(options?: {filter?: string}) => Promise<Tier[]>} getAll
 */

/**
 * @typedef {object} ISlugService
 * @prop {(input: string) => Promise<string>} generate
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

    /** @type {ISlugService} */
    #slugService;

    constructor(deps) {
        this.#repository = deps.repository;
        this.#slugService = deps.slugService;
    }

    /**
     * @param {object} [options]
     * @param {any} [options.filter] - A mongo query object
     *
     * @returns {Promise<Page<Tier>>}
     */
    async browse(options = {}) {
        if (typeof options.filter === 'string') {
            throw new IncorrectUsageError({
                message: 'filter must be a mongo query object'
            });
        }
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
     * Fetches the default tier
     * @param {object} [options]
     * @returns {Promise<Tier>}
     */
    async readDefaultTier(options = {}) {
        const [defaultTier] = await this.#repository.getAll({
            filter: {
                $and: [
                    {type: 'paid'},
                    {active: true}
                ]
            },
            limit: 1,
            ...options
        });

        return defaultTier;
    }

    /**
     * @param {string} idString
     * @param {object} data
     * @returns {Promise<Tier>}
     */
    async edit(idString, data) {
        const id = ObjectID.createFromHexString(idString);
        const tier = await this.#repository.getById(id);

        const editableProperties = [
            'name',
            'benefits',
            'description',
            'visibility',
            'status',
            'trialDays',
            'welcomePageURL'
        ];

        for (const editableProperty of editableProperties) {
            if (Reflect.has(data, editableProperty)) {
                tier[editableProperty] = data[editableProperty];
            }
        }

        tier.updatePricing({
            currency: data.currency || tier.currency,
            monthlyPrice: data.monthlyPrice || tier.monthlyPrice,
            yearlyPrice: data.yearlyPrice || tier.yearlyPrice
        });

        await this.#repository.save(tier);

        return tier;
    }

    /**
     * @param {object} data
     * @returns {Promise<Tier>}
     */
    async add(data) {
        if (data.type === 'free') {
            throw new BadRequestError({
                message: 'Cannot create free Tier'
            });
        }

        const slug = await this.#slugService.generate(data.slug || data.name);
        const tier = await Tier.create({
            slug,
            type: 'paid',
            status: 'active',
            visibility: data.visibility,
            name: data.name,
            description: data.description,
            benefits: data.benefits,
            welcomePageURL: data.welcomePageURL,
            monthlyPrice: data.monthlyPrice,
            yearlyPrice: data.yearlyPrice,
            currency: data.currency,
            trialDays: data.trialDays
        });

        await this.#repository.save(tier);

        return tier;
    }
};
