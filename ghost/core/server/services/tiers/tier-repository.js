const Tier = require('./tier');
const nql = require('@tryghost/nql');
const errors = require('@tryghost/errors');

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

  /** Counts the writes save() has made, so a reload can tell one landed while it read. */
  #writes = 0;

  /** @type {Object} */
  #ProductModel;

  /** @type {import('@tryghost/domain-events')} */
  #DomainEvents;

  /** @type {import('./requirements').TierRequirements} */
  #requirements;

  /** @type {Pick<import('../invalidations/invalidations-service').InvalidationsService, 'register'>} */
  #invalidations;

  /** @type {import('../invalidations/invalidations-service').InvalidationHandle | undefined} */
  #invalidation;

  /**
   * @param {object} deps
   * @param {object} deps.ProductModel Bookshelf Model
   * @param {import('@tryghost/domain-events')} deps.DomainEvents
   * @param {import('./requirements').TierRequirements} deps.requirements
   * @param {Pick<import('../invalidations/invalidations-service').InvalidationsService, 'register'>} deps.invalidations
   */
  constructor(deps) {
    this.#ProductModel = deps.ProductModel;
    this.#DomainEvents = deps.DomainEvents;
    this.#requirements = deps.requirements;
    this.#invalidations = deps.invalidations;
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

  async init() {
    const writes = this.#writes;
    const models = await this.#ProductModel.findAll({
      withRelated: ['benefits'],
    });
    const store = await Promise.all(models.map((model) => Tier.create(this.mapToTier(model))));
    if (this.#store && writes !== this.#writes) {
      // It may have read before a save that has since cached its tier. That
      // save found this reload running, so a rerun that reads after it follows.
      return;
    }
    // Swapped together, so a save() meanwhile still finds the tiers it edits
    this.#store = store;
    this.#ids = new Set(store.map((tier) => tier.id.toHexString()));
    // Registered once loaded, so a peer's message during the first load
    // counts as missed and reloads after it, rather than racing it. Reloading
    // dispatches no events: the instance that saved already has.
    this.#invalidation ??= this.#invalidations.register('tiers', () => this.init());
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

    // Cached without requirements, which are read fresh whenever they're asked for.
    const toSave = await Tier.create({ ...tier.toJSON(), requirements: undefined });

    const store = this.#store;
    if (this.#ids.has(data.id)) {
      await this.#ProductModel.edit(data, {
        id: data.id,
      });
    } else {
      await this.#ProductModel.add(data);
    }
    this.#writes += 1;
    // Only after the write: a reload running now then runs again and reads it
    void this.#invalidation.notifyPeers();
    let readBackError = null;
    if (this.#store === store) {
      const existing = store.findIndex((item) => item.id.equals(tier.id));
      if (existing === -1) {
        store.push(toSave);
        this.#ids.add(data.id);
      } else {
        store.splice(existing, 1, toSave);
      }
    } else {
      // A reload swapped the cache during the write. It may have read before
      // the write, or after a peer's newer one, so only the database knows.
      try {
        await this.#invalidation.reload();
      } catch (err) {
        readBackError = err;
      }
    }

    // The write stands either way, so its events go out
    for (const event of tier.events) {
      this.#DomainEvents.dispatch(event);
    }
    if (readBackError) {
      // Retrying the write or caching this tier could each undo a newer write
      throw new errors.InternalServerError({
        message: 'The tier was saved, but the tiers could not be read back',
        err: readBackError,
      });
    }
  }
};
