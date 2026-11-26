const Milestone = require('./milestone');

/**
 * @typedef {import('./milestones-service').IMilestoneRepository} IMilestoneRepository
 */

/**
 * @implements {IMilestoneRepository}
 */
module.exports = class BookshelfMilestoneRepository {
  /** @type {Object} */
  #MilestoneModel;

  /** @type {import('@tryghost/domain-events')} */
  #DomainEvents;

  /**
   * @param {object} deps
   * @param {object} deps.MilestoneModel Bookshelf Model
   * @param {import('@tryghost/domain-events')} deps.DomainEvents
   */
  constructor(deps) {
    this.#MilestoneModel = deps.MilestoneModel;
    this.#DomainEvents = deps.DomainEvents;
  }

  #modelToMilestone(model) {
    return Milestone.create({
      id: model.get('id'),
      type: model.get('type'),
      value: model.get('value'),
      currency: model.get('currency'),
      createdAt: model.get('created_at'),
      emailSentAt: model.get('email_sent_at'),
    });
  }

  /**
   * @param {Milestone} milestone
   * @returns {Promise<void>}
   */
  async save(milestone) {
    const data = {
      id: milestone.id.toHexString(),
      type: milestone.type,
      value: milestone.value,
      currency: milestone?.currency,
      created_at: milestone?.createdAt,
      email_sent_at: milestone?.emailSentAt,
    };

    const existing = await this.#MilestoneModel.findOne({ id: data.id }, { require: false });

    if (!existing) {
      await this.#MilestoneModel.add(data);
    } else {
      await this.#MilestoneModel.edit(data, {
        id: data.id,
      });
    }
    for (const event of milestone.events) {
      this.#DomainEvents.dispatch(event);
    }
  }

  /**
   * @param {'arr'|'members'} type
   * @param {string} [currency]
   * @param {object} [options]
   * @param {object} [options.transacting]
   *
   * @returns {Promise<Milestone[]>}
   */
  async getAllByType(type, currency = 'usd', options = {}) {
    const { transacting } = options;
    let milestone = null;

    if (type === 'arr') {
      milestone = await this.#MilestoneModel.findAll(
        {
          filter: `currency:${currency}+type:arr`,
          order: 'created_at ASC, value DESC',
          transacting,
        },
        { require: false },
      );
    } else {
      milestone = await this.#MilestoneModel.findAll(
        { filter: 'type:members', order: 'created_at ASC, value DESC', transacting },
        { require: false },
      );
    }

    if (!milestone || !milestone?.models?.length) {
      return [];
    }

    const milestones = await Promise.all(
      milestone.models.map((model) => this.#modelToMilestone(model)),
    );

    // Enforce ordering by value as Bookshelf seems to ignore it
    return milestones.sort((a, b) => b.value - a.value);
  }

  /**
   * @param {'arr'|'members'} type
   * @param {string} [currency]
   * @param {object} [options]
   * @param {object} [options.transacting]
   *
   * @returns {Promise<Milestone|null>}
   */
  async getLatestByType(type, currency = 'usd', options = {}) {
    const allMilestonesForType = await this.getAllByType(type, currency, options);
    return allMilestonesForType?.[0] || null;
  }

  /**
   * @param {object} [options]
   * @param {object} [options.transacting]
   *
   * @returns {Promise<Milestone|null>}
   */
  async getLastEmailSent(options = {}) {
    let milestone = await this.#MilestoneModel.findAll(
      {
        filter: 'email_sent_at:-null',
        order: 'email_sent_at ASC',
        transacting: options.transacting,
      },
      { require: false },
    );

    if (!milestone || !milestone?.models?.length) {
      return null;
    } else {
      milestone = milestone.models?.[0];
    }

    return this.#modelToMilestone(milestone);
  }

  /**
   * @param {number} value
   * @param {string} [currency]
   * @param {object} [options]
   * @param {object} [options.transacting]
   *
   * @returns {Promise<Milestone|null>}
   */
  async getByARR(value, currency = 'usd', options = {}) {
    // find a milestone of the ARR type by a given value
    const milestone = await this.#MilestoneModel.findOne(
      { type: 'arr', currency: currency, value: value },
      { require: false, transacting: options.transacting },
    );

    if (!milestone) {
      return null;
    }
    return this.#modelToMilestone(milestone);
  }

  /**
   * @param {number} value
   * @param {object} [options]
   * @param {object} [options.transacting]
   *
   * @returns {Promise<Milestone|null>}
   */
  async getByCount(value, options = {}) {
    // find a milestone of the members type by a given value
    const milestone = await this.#MilestoneModel.findOne(
      { type: 'members', value: value },
      { require: false, transacting: options.transacting },
    );

    if (!milestone) {
      return null;
    }
    return this.#modelToMilestone(milestone);
  }
};
