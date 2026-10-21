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
  #store;
  /** @type {Set<string>} */
  #ids = new Set();

  /** @type {Object} */
  #ProductModel;

  /** @type {import('@tryghost/domain-events')} */
  #DomainEvents;

  /** @type {import('./requirements').TierRequirements} */
  #requirements;

  /**
   * @param {object} deps
   * @param {object} deps.ProductModel Bookshelf Model
   * @param {import('@tryghost/domain-events')} deps.DomainEvents
   * @param {import('./requirements').TierRequirements} deps.requirements
   */
  constructor(deps) {
    this.#ProductModel = deps.ProductModel;
    this.#DomainEvents = deps.DomainEvents;
    this.#requirements = deps.requirements;
  }

  /**
   * Copies of these stored tiers, each with what its members must give when asked for.
   * Requirements are read from the database on every call, as the checkout settings change them
   * without saving a tier.
   *
   * @param {import('./tier')[]} stored
   * @param {import('./tiers-api').ReadOptions} options
   * @returns {Promise<import('./tier')[]>}
   */
  async #copiesOf(stored, options) {
    if (!options.withRequirements) {
      return Promise.all(stored.map((tier) => Tier.create(tier)));
    }
    const requirements = await this.#requirements.forTiers(
      stored.map((tier) => ({ id: tier.id.toHexString(), type: tier.type })),
    );
    return Promise.all(
      stored.map((tier) =>
        Tier.create({ ...tier.toJSON(), requirements: requirements.get(tier.id.toHexString()) }),
      ),
    );
  }

  async init() {
    const models = await this.#ProductModel.findAll({
      withRelated: ['benefits'],
    });
    this.#ids.clear();
    this.#store = await Promise.all(
      models.map(async (model) => {
        const tier = await Tier.create(this.mapToTier(model));
        this.#ids.add(tier.id.toHexString());
        return tier;
      }),
    );
  }

  /**
   * @param {import('./tier')} tier
   * @returns {any}
   */
  toPrimitive(tier) {
    return {
      ...tier.toJSON(),
      active: tier.status === 'active',
      type: tier.type,
      id: tier.id.toHexString(),
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
      benefits: json.benefits.map((item) => item.name),
    };
  }

  /**
   * @param {import('./tiers-api').ReadOptions & {filter?: string}} [options]
   * @returns {Promise<import('./tier')[]>}
   */
  async getAll(options = {}) {
    const filter = nql();
    filter.filter = options.filter || {};
    return this.#copiesOf(
      this.#store.filter((item) => {
        return filter.queryJSON(this.toPrimitive(item));
      }),
      options,
    );
  }

  /**
   * @param {import('bson-objectid').default} id
   * @param {import('./tiers-api').ReadOptions} [options]
   * @returns {Promise<import('./tier')>}
   */
  async getById(id, options = {}) {
    const found = this.#store.find((item) => {
      return item.id.equals(id);
    });

    if (!found) {
      return null;
    }

    const [tier] = await this.#copiesOf([found], options);
    return tier;
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
      benefits: tier.benefits.map((name) => ({ name })),
    };

    const toSave = await Tier.create(tier);

    if (this.#ids.has(tier.id.toHexString())) {
      const existing = this.#store.findIndex((item) => {
        return item.id.equals(tier.id);
      });
      await this.#ProductModel.edit(data, {
        id: data.id,
      });
      this.#store.splice(existing, 1, toSave);
    } else {
      await this.#ProductModel.add(data);
      this.#store.push(toSave);
      this.#ids.add(tier.id.toHexString());
    }

    for (const event of tier.events) {
      this.#DomainEvents.dispatch(event);
    }
  }
};
