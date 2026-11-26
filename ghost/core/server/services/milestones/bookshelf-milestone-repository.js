const { afterCommit } = require('../../lib/after-commit');
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

  /** @type {import('@tryghost/logging').GhostLogger} */
  #logging;

  /**
   * @param {object} deps
   * @param {object} deps.MilestoneModel Bookshelf Model
   * @param {import('@tryghost/domain-events')} deps.DomainEvents
   * @param {import('@tryghost/logging').GhostLogger} deps.logging
   */
  constructor(deps) {
    this.#MilestoneModel = deps.MilestoneModel;
    this.#DomainEvents = deps.DomainEvents;
    this.#logging = deps.logging;
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
   * @template T
   * @param {(transacting: object) => Promise<T>} fn
   * @returns {Promise<T>}
   */
  async transaction(fn) {
    return this.#MilestoneModel.transaction(fn);
  }

  /**
   * Locks the site_uuid setting row so concurrent checks run one at a time.
   * The milestones table can be empty, so it has no row of its own to lock.
   *
   * @param {object} transacting
   * @returns {Promise<void>}
   */
  async lockChecks(transacting) {
    await transacting('settings').where('key', 'site_uuid').forUpdate().first('id');
  }

  /**
   * @param {Milestone} milestone
   * @param {object} [options]
   * @param {object} [options.transacting]
   * @returns {Promise<void>}
   */
  async save(milestone, options = {}) {
    const data = {
      id: milestone.id.toHexString(),
      type: milestone.type,
      value: milestone.value,
      currency: milestone?.currency,
      created_at: milestone?.createdAt,
      email_sent_at: milestone?.emailSentAt,
    };

    const { transacting } = options;
    const existing = await this.#MilestoneModel.findOne(
      { id: data.id },
      { require: false, transacting },
    );

    if (!existing) {
      await this.#MilestoneModel.add(data, { transacting });
    } else {
      await this.#MilestoneModel.edit(data, {
        id: data.id,
        transacting,
      });
    }

    afterCommit(
      transacting,
      () => {
        try {
          for (const event of milestone.events) {
            this.#DomainEvents.dispatch(event);
          }
        } catch (err) {
          this.#logging.error(err);
        }
      },
      // Rolled back: the milestone was never stored, so there is nothing to announce.
      () => {},
    );
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
