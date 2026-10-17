const FullPostLink = require('./full-post-link');
const _ = require('lodash');

/**
 * @typedef {import('bson-objectid').default} ObjectID
 * @typedef {import('./post-link')} PostLink
 */

module.exports = class PostLinkRepository {
  /** @type {Object} */
  #LinkRedirect;
  /** @type {Object} */
  #linkRedirectRepository;
  /** @type {import('knex').Knex} */
  #knex;

  /**
   * @param {object} deps
   * @param {object} deps.LinkRedirect Bookshelf Model
   * @param {object} deps.linkRedirectRepository Bookshelf Model
   * @param {import('knex').Knex} deps.knex
   */
  constructor(deps) {
    this.#LinkRedirect = deps.LinkRedirect;
    this.#linkRedirectRepository = deps.linkRedirectRepository;
    this.#knex = deps.knex;
  }

  /**
   *
   * @param {*} options
   * @returns {Promise<InstanceType<FullPostLink>[]>}
   */
  async getAll(options) {
    // Create a collection with applied filters
    const itemCollection = this.#LinkRedirect.forge();

    // Apply default and custom filters from the options
    if (options.filter) {
      itemCollection.applyDefaultAndCustomFilters({ filter: options.filter });
    }

    // Apply ordering
    itemCollection.query((qb) => {
      qb.orderByRaw('`count__clicks` DESC, `to` DESC');
    });

    // Fetch the collection with the applied query modifications
    const collection = await itemCollection.fetchAll({ withRelated: ['count.clicks'] });

    // An email links to the same URL from several places, each with its own redirect,
    // so merge those and count each member once per destination
    const groups = new Map();
    for (const model of collection.models) {
      const key = `${model.get('post_id')}\n${model.get('to')}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(model);
    }

    const groupClicks = await this.#getGroupedClicks(
      [...groups.values()].filter((models) => models.length > 1).flat(),
    );

    const result = [];

    for (const [key, models] of groups) {
      const model = models[0];
      const link = this.#linkRedirectRepository.fromModel(model);

      result.push(
        new FullPostLink({
          post_id: model.get('post_id'),
          link,
          count: {
            clicks: groupClicks.get(key) ?? model.get('count__clicks'),
          },
        }),
      );
    }

    return result.sort((a, b) => b.count.clicks - a.count.clicks);
  }

  /**
   * @param {Object[]} models redirects that share a post and destination with another redirect
   * @returns {Promise<Map<string, number>>} distinct clicking members keyed by post_id and to
   */
  async #getGroupedClicks(models) {
    if (models.length === 0) {
      return new Map();
    }

    const keys = new Map();
    for (const model of models) {
      keys.set(model.id, `${model.get('post_id')}\n${model.get('to')}`);
    }

    // Bookshelf transforms `to`, so match rows back to their group by redirect id
    const rows = await this.#knex('redirects')
      .join('members_click_events', 'members_click_events.redirect_id', 'redirects.id')
      .whereIn('redirects.id', [...keys.keys()])
      .whereRaw('redirects.updated_at <= members_click_events.created_at')
      .min('redirects.id as redirect_id')
      .countDistinct('members_click_events.member_id as clicks')
      .groupBy('redirects.post_id', 'redirects.to');

    const clicks = new Map();
    for (const key of keys.values()) {
      clicks.set(key, 0);
    }
    for (const row of rows) {
      clicks.set(keys.get(row.redirect_id), Number(row.clicks));
    }

    return clicks;
  }

  async updateLinks(linkIds, updateData, options) {
    const bulkUpdateOptions = _.pick(options, ['transacting']);

    const bulkActionResult = await this.#LinkRedirect.bulkEdit(linkIds, 'redirects', {
      ...bulkUpdateOptions,
      data: updateData,
    });

    return {
      bulk: {
        action: 'updateLink',
        meta: {
          stats: {
            successful: bulkActionResult.successful,
            unsuccessful: bulkActionResult.unsuccessful,
          },
          errors: bulkActionResult.errors,
          unsuccessfulData: bulkActionResult.unsuccessfulData,
        },
      },
    };
  }

  /**
   * @param {PostLink} postLink
   * @returns {Promise<void>}
   */
  async save(postLink) {
    await this.#LinkRedirect.edit(
      {
        post_id: postLink.post_id.toHexString(),
      },
      {
        id: postLink.link_id.toHexString(),
        importing: true, // skip setting updated_at when linking a post to a link
      },
    );
  }
};
