const Tier = require('./tier');
const nql = require('@tryghost/nql');

/**
 * @typedef {import('./tiers-api').ITierRepository} ITierRepository
 */

/**
 * @typedef {object} Cache
 * @prop {import('./tier')[]} store
 * @prop {Set<string>} ids
 */

/**
 * Keeps every tier in memory, loaded from the database the first time a tier is read or saved
 * and held from then on. Tiers are read on most requests, so a read costs no query.
 *
 * @implements {ITierRepository}
 */
module.exports = class TierRepository {
  /**
   * The loaded tiers, or the load in flight. Unset until first use, and after `reload()`.
   * @type {Promise<Cache> | undefined}
   */
  #loading;

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
    const requirements = options.withRequirements
      ? await this.#requirements.forTiers(
          stored.map((tier) => ({ id: tier.id.toHexString(), type: tier.type })),
        )
      : null;
    return Promise.all(
      stored.map((tier) =>
        Tier.create({ ...tier.toJSON(), requirements: requirements?.get(tier.id.toHexString()) }),
      ),
    );
  }

  /**
   * Reads every tier from the database.
   *
   * @param {import('knex').Knex.Transaction} [transacting]
   * @returns {Promise<Cache>}
   */
  async #load(transacting) {
    const models = await this.#ProductModel.findAll({
      withRelated: ['benefits'],
      ...(transacting ? { transacting } : {}),
    });
    const ids = new Set();
    const store = await Promise.all(
      models.map(async (model) => {
        const tier = await Tier.create(this.mapToTier(model));
        ids.add(tier.id.toHexString());
        return tier;
      }),
    );
    return { store, ids };
  }

  /**
   * The loaded tiers, loading them on first use. Overlapping first uses share one load, and a
   * failed load is not kept, so the next use loads again.
   *
   * A first use inside a transaction loads through it, as SQLite has a single connection that
   * the transaction holds. What a transaction sees can be rolled back, so that load serves the
   * one call and is not kept.
   *
   * @param {{transacting?: import('knex').Knex.Transaction}} [options]
   * @returns {Promise<Cache>}
   */
  #cache(options = {}) {
    if (this.#loading) {
      return this.#loading;
    }
    if (options.transacting) {
      return this.#load(options.transacting);
    }
    const loading = this.#load().catch((error) => {
      if (this.#loading === loading) {
        this.#loading = undefined;
      }
      throw error;
    });
    this.#loading = loading;
    return loading;
  }

  /**
   * Forgets the loaded tiers, so the next use reads them from the database again. For rows
   * written to the database without going through `save`, as test fixtures do.
   */
  reload() {
    this.#loading = undefined;
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
   * @param {import('./tiers-api').ReadOptions & {filter?: object}} [options] - The filter is a mongo query object
   * @returns {Promise<import('./tier')[]>}
   */
  async getAll(options = {}) {
    const { store } = await this.#cache(options);
    const filter = nql();
    filter.filter = options.filter || {};
    return this.#copiesOf(
      store.filter((item) => {
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
    const { store } = await this.#cache(options);
    const found = store.find((item) => {
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

    // Cached without requirements, which are read fresh whenever they're asked for.
    const toSave = await Tier.create({ ...tier.toJSON(), requirements: undefined });

    const { store, ids } = await this.#cache();
    if (ids.has(tier.id.toHexString())) {
      await this.#ProductModel.edit(data, {
        id: data.id,
      });
      // Looked up after the write, as another save may have changed the store meanwhile.
      const existing = store.findIndex((item) => {
        return item.id.equals(tier.id);
      });
      store.splice(existing, 1, toSave);
    } else {
      await this.#ProductModel.add(data);
      store.push(toSave);
      ids.add(tier.id.toHexString());
    }

    for (const event of tier.events) {
      this.#DomainEvents.dispatch(event);
    }
  }
};
