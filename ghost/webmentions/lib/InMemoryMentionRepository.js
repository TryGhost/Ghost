const nql = require('@tryghost/nql');
const Mention = require('./Mention');

/**
 * @typedef {import('./Mention')} Mention
 * @typedef {import('./MentionsAPI').GetPageOptions} GetPageOptions
 * @typedef {import('./MentionsAPI').IMentionRepository} IMentionRepository
 */

/**
 * @template Model
 * @typedef {import('./MentionsAPI').Page<Model>} Page<Model>
 */

/**
 * @implements {IMentionRepository}
 */
module.exports = class InMemoryMentionRepository {
    /** @type {Mention[]} */
    #store = [];
    /** @type {Object.<string, true>} */
    #ids = {};

    /**
     * @param {Mention} mention
     * @returns {any}
     */
    toPrimitive(mention) {
        return {
            ...mention.toJSON(),
            id: mention.id.toHexString(),
            resource_id: mention.resourceId ? mention.resourceId.toHexString() : null
        };
    }

    /**
     * @param {Mention} mention
     * @returns {Promise<void>}
     */
    async save(mention) {
        if (this.#ids[mention.id.toHexString()]) {
            const existing = this.#store.findIndex((item) => {
                return item.id.equals(mention.id);
            });
            this.#store.splice(existing, 1, mention);
        } else {
            this.#store.push(mention);
            this.#ids[mention.id.toHexString()] = true;
        }
    }

    /**
     * @param {URL} source
     * @param {URL} target
     * @returns {Promise<Mention>}
     */
    async getBySourceAndTarget(source, target) {
        return this.#store.find((item) => {
            return item.source.href === source.href && item.target.href === target.href;
        });
    }

    /**
     * @param {object} options
     * @param {string} [options.filter]
     * @param {string} [options.order]
     * @param {number | null} options.page
     * @param {number | 'all'} options.limit
     * @returns {Promise<Page<Mention>>}
     */
    async getPage(options) {
        const filter = nql(options.filter || '', {});
        const data = this.#store.slice();

        const results = data.slice().filter((item) => {
            return filter.queryJSON(this.toPrimitive(item)) && !Mention.isDeleted(item);
        });

        if (options.order === 'created_at desc') {
            results.sort((a, b) => {
                return Number(b.timestamp) - Number(a.timestamp);
            });
        }

        if (options.limit === 'all') {
            return {
                data: results,
                meta: {
                    pagination: {
                        page: 1,
                        pages: 1,
                        limit: 'all',
                        total: results.length,
                        prev: null,
                        next: null
                    }
                }
            };
        }

        const start = (options.page - 1) * options.limit;
        const end = start + options.limit;
        const pages = Math.ceil(results.length / options.limit);
        return {
            data: results.slice(start, end),
            meta: {
                pagination: {
                    page: options.page,
                    pages: pages,
                    limit: options.limit,
                    total: results.length,
                    prev: options.page === 1 ? null : options.page - 1,
                    next: options.page === pages ? null : options.page + 1
                }
            }
        };
    }

    async getAll(options) {
        const page = await this.getPage({
            filter: options.filter,
            order: options.order,
            page: null,
            limit: 'all'
        });

        return page.data;
    }
};
