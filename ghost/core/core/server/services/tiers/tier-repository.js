const Tier = require('./tier');
const nql = require('@tryghost/nql');

/**
 * @typedef {import('./tiers-api').ITierRepository} ITierRepository
 */

/**
 * @implements {ITierRepository}
 */
module.exports = class TierRepository {
    /** @type {import('./tier')[]} */
    #store = [];
    /** @type {Object.<string, true>} */
    #ids = {};

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

    async init() {
        this.#store = [];
        this.#ids = {};
        const models = await this.#ProductModel.findAll({
            withRelated: ['benefits']
        });
        for (const model of models) {
            const tier = await Tier.create(this.mapToTier(model));
            this.#store.push(tier);
            this.#ids[tier.id.toHexString()] = true;
        }
    }

    /**
     * @param {import('./tier')} tier
     * @returns {any}
     */
    toPrimitive(tier) {
        return {
            ...tier.toJSON(),
            active: (tier.status === 'active'),
            type: tier.type,
            id: tier.id.toHexString()
        };
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
     * @returns {Promise<import('./tier')[]>}
     */
    async getAll(options = {}) {
        const filter = nql();
        filter.filter = options.filter || {};
        return Promise.all(this.#store.slice().filter((item) => {
            return filter.queryJSON(this.toPrimitive(item));
        }).map((tier) => {
            return Tier.create(tier);
        }));
    }

    /**
     * @param {import('bson-objectid').default} id
     * @returns {Promise<import('./tier')>}
     */
    async getById(id) {
        const found = this.#store.find((item) => {
            return item.id.equals(id);
        });

        if (!found) {
            return null;
        }

        return Tier.create(found);
    }

    /**
     * @param {import('./tier')} tier
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

        const toSave = await Tier.create(tier);

        if (this.#ids[tier.id.toHexString()]) {
            const existing = this.#store.findIndex((item) => {
                return item.id.equals(tier.id);
            });
            await this.#ProductModel.edit(data, {
                id: data.id
            });
            this.#store.splice(existing, 1, toSave);
        } else {
            await this.#ProductModel.add(data);
            this.#store.push(toSave);
            this.#ids[tier.id.toHexString()] = true;
        }

        for (const event of tier.events) {
            this.#DomainEvents.dispatch(event);
        }
    }
};
