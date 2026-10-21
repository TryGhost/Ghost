const ObjectID = require('bson-objectid').default;
const { BadRequestError, IncorrectUsageError } = require('@tryghost/errors');
const Tier = require('./tier');

/**
 * @typedef {object} ReadOptions
 * @prop {boolean} [withRequirements] - Reads what each tier's members must give
 */

/**
 * @typedef {object} ITierRepository
 * @prop {(id: ObjectID, options?: ReadOptions) => Promise<Tier>} getById
 * @prop {(tier: Tier) => Promise<void>} save
 * @prop {(options?: ReadOptions & {filter?: object}) => Promise<Tier[]>} getAll
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
   * @param {ReadOptions & {filter?: any}} [options] - The filter is a mongo query object
   *
   * @returns {Promise<Page<Tier>>}
   */
  async browse(options = {}) {
    if (typeof options.filter === 'string') {
      throw new IncorrectUsageError({
        message: 'filter must be a mongo query object',
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
          next: null,
        },
      },
    };
  }

  /**
   * @param {string} idString
   * @param {ReadOptions} [options]
   *
   * @returns {Promise<Tier>}
   */
  async read(idString, options = {}) {
    const id = ObjectID.createFromHexString(idString);
    const tier = await this.#repository.getById(id, options);

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
        $and: [{ type: 'paid' }, { active: true }],
      },
      limit: 1,
      ...options,
    });

    return defaultTier;
  }

  /**
   * @param {string} idString
   * @param {object} data
   * @param {ReadOptions} [options] - How the edited tier is read back
   * @returns {Promise<Tier>} The tier as saved
   */
  async edit(idString, data, options = {}) {
    const id = ObjectID.createFromHexString(idString);
    const tier = await this.#repository.getById(id);

    const editableProperties = [
      'name',
      'benefits',
      'description',
      'visibility',
      'status',
      'trialDays',
      'welcomePageURL',
    ];

    for (const editableProperty of editableProperties) {
      if (Reflect.has(data, editableProperty)) {
        tier[editableProperty] = data[editableProperty];
      }
    }

    tier.updatePricing({
      currency: data.currency || tier.currency,
      monthlyPrice: data.monthlyPrice || tier.monthlyPrice,
      yearlyPrice: data.yearlyPrice || tier.yearlyPrice,
    });

    await this.#repository.save(tier);

    return this.#repository.getById(id, options);
  }

  /**
   * @param {object} data
   * @param {ReadOptions} [options] - How the added tier is read back
   * @returns {Promise<Tier>} The tier as saved
   */
  async add(data, options = {}) {
    if (data.type === 'free') {
      throw new BadRequestError({
        message: 'Cannot create free Tier',
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
      trialDays: data.trialDays,
    });

    await this.#repository.save(tier);

    return this.#repository.getById(tier.id, options);
  }
};
