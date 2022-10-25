const {Tier} = require('@tryghost/tiers');

/**
 * @typedef {import('@tryghost/tiers/lib/TiersAPI').ITierRepository} ITierRepository
 */

/**
 * @implements {ITierRepository}
 */
module.exports = class TierRepository {
    /** @type {Object} */
    #ProductModel;

    /** @type {import('@tryghost/domain-events')} */
    #DomainEvents;

    /**
     * @param {object} deps
     * @param {object} deps.ProductModel Bookshelf Model
     * @param {import('@tryghost/domain-events')} deps.DomainEvents
     */
    constructor(deps) {
        this.#ProductModel = deps.ProductModel;
        this.#DomainEvents = deps.DomainEvents;
    }

    /**
     * @private
     */
    mapToTier(model) {
        const json = model.toJSON();
        return {
            id: json.id,
            name: json.name,
            slug: json.slug,
            status: json.active ? 'active' : 'archived',
            welcomePageURL: json.welcome_page_url,
            visibility: json.visibility,
            trialDays: json.trial_days,
            description: json.description,
            type: json.type,
            currency: json.currency,
            monthlyPrice: json.monthly_price,
            yearlyPrice: json.yearly_price,
            createdAt: json.created_at,
            updatedAt: json.updated_at,
            benefits: json.benefits.map(item => item.name)
        };
    }

    /**
     * @param {object} [options]
     * @param {string} [options.filter]
     * @returns {Promise<import('@tryghost/tiers/lib/Tier')[]>}
     */
    async getAll(options = {}) {
        const collection = await this.#ProductModel.findAll({...options, withRelated: ['benefits']});

        const result = [];

        for (const model of collection.models) {
            const tier = await Tier.create(this.mapToTier(model));
            result.push(tier);
        }

        return result;
    }

    /**
     * @param {import('bson-objectid').default} id
     * @returns {Promise<import('@tryghost/tiers/lib/Tier')>}
     */
    async getById(id) {
        const model = await this.#ProductModel.findOne({id: id.toHexString()}, {withRelated: ['benefits']});

        return await Tier.create(this.mapToTier(model));
    }

    /**
     * @param {import('@tryghost/tiers/lib/Tier')} tier
     * @returns {Promise<void>}
     */
    async save(tier) {
        const data = {
            id: tier.id.toHexString(),
            name: tier.name,
            slug: tier.slug,
            active: tier.status === 'active',
            welcome_page_url: tier.welcomePageURL,
            visibility: tier.visibility,
            trial_days: tier.trialDays,
            description: tier.description,
            type: tier.type,
            currency: tier.currency,
            monthly_price: tier.monthlyPrice,
            yearly_price: tier.yearlyPrice,
            created_at: tier.createdAt,
            updated_at: tier.updatedAt,
            benefits: tier.benefits.map(name => ({name}))
        };

        const existing = await this.#ProductModel.findOne({id: data.id}, {require: false});

        if (!existing) {
            await this.#ProductModel.add(data);
        } else {
            await this.#ProductModel.edit(data, {
                id: data.id
            });
        }

        for (const event of tier.events) {
            this.#DomainEvents.dispatch(event);
        }
    }
};
