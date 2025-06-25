const ghostBookshelf = require('./base');
const ObjectID = require('bson-objectid').default;
const crypto = require('crypto');
const urlUtils = require('../../shared/url-utils');

const Newsletter = ghostBookshelf.Model.extend({
    tableName: 'newsletters',

    defaults: function defaults() {
        return {
            uuid: crypto.randomUUID(),
            sender_reply_to: 'newsletter',
            status: 'active',
            visibility: 'members',
            subscribe_on_signup: true,
            sort_order: 0,
            title_font_category: 'sans_serif',
            title_alignment: 'center',
            show_feature_image: true,
            body_font_category: 'sans_serif',
            show_badge: true,
            show_header_icon: true,
            show_header_title: true,
            show_header_name: true,
            show_post_title_section: true,
            show_comment_cta: true,
            show_subscription_details: false,
            show_latest_posts: false,
            background_color: 'light',
            feedback_enabled: false,
            show_excerpt: false,
            button_corners: 'rounded',
            button_style: 'fill',
            button_color: 'accent',
            title_font_weight: 'bold',
            link_style: 'underline',
            link_color: 'accent',
            image_corners: 'square',
            header_background_color: 'transparent'
        };
    },

    members() {
        return this.belongsToMany('Member', 'members_newsletters', 'newsletter_id', 'member_id')
            .query((qb) => {
                // avoids bookshelf adding a `DISTINCT` to the query
                // we know the result set will already be unique and DISTINCT hurts query performance
                qb.columns('members.*');
            });
    },

    posts() {
        return this.hasMany('Post');
    },

    // Force active newsletters for content API
    enforcedFilters: function enforcedFilters(options) {
        return (options.context && options.context.public) ? 'status:active' : null;
    },

    async onSaving(model, _attr, options) {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (model.get('name')) {
            model.set('name', model.get('name').trim());
        }

        if (model.hasChanged('slug') || !model.get('slug')) {
            const slug = model.get('slug') || model.get('name');

            if (slug) {
                const cleanSlug = await ghostBookshelf.Model.generateSlug(Newsletter, slug, {
                    transacting: options.transacting
                });

                model.set({slug: cleanSlug});
            }
        }
    },

    subscribeMembersById(memberIds, unfilteredOptions = {}) {
        let pivotRows = [];
        for (const memberId of memberIds) {
            pivotRows.push({
                id: ObjectID().toHexString(),
                member_id: memberId.id,
                newsletter_id: this.id
            });
        }

        const query = ghostBookshelf.knex.batchInsert('members_newsletters', pivotRows);

        if (unfilteredOptions.transacting) {
            query.transacting(unfilteredOptions.transacting);
        }

        return query;
    },

    formatOnWrite(attrs) {
        ['header_image'].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.toTransformReady(attrs[attr]);
            }
        });

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        ['header_image'].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.transformReadyToAbsolute(attrs[attr]);
            }
        });

        return attrs;
    }
}, {
    /**
     * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
     * @param {String} methodName The name of the method to check valid options for.
     * @return {Array} Keys allowed in the `options` hash of the model's method.
     */
    permittedOptions: function permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);

        // allowlists for the `options` hash argument on methods, by method name.
        // these are the only options that can be passed to Bookshelf / Knex.
        const validOptions = {
            findOne: ['filter'],
            findAll: ['filter']
        };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    countRelations() {
        return {
            posts(modelOrCollection) {
                modelOrCollection.query('columns', 'newsletters.*', (qb) => {
                    qb.count('posts.id')
                        .from('posts')
                        .whereRaw('posts.newsletter_id = newsletters.id')
                        .as('count__posts');
                });
            },
            members(modelOrCollection) {
                modelOrCollection.query('columns', 'newsletters.*', (qb) => {
                    qb.count('members_newsletters.id')
                        .from('members_newsletters')
                        .whereRaw('members_newsletters.newsletter_id = newsletters.id')
                        .as('count__members');
                });
            },
            active_members(modelOrCollection) {
                modelOrCollection.query('columns', 'newsletters.*', (qb) => {
                    qb.count('members_newsletters.id')
                        .from('members_newsletters')
                        .join('members', 'members.id', 'members_newsletters.member_id')
                        .whereRaw('members_newsletters.newsletter_id = newsletters.id')
                        .andWhere('members.email_disabled', false)
                        .as('count__active_members');
                });
            }
        };
    },

    orderDefaultRaw: function () {
        return 'sort_order ASC, created_at ASC, id ASC';
    },

    orderDefaultOptions: function orderDefaultOptions() {
        return {
            sort_order: 'ASC',
            created_at: 'ASC',
            id: 'ASC'
        };
    },

    getDefaultNewsletter: async function getDefaultNewsletter(unfilteredOptions = {}) {
        const options = {
            filter: 'status:active',
            order: this.orderDefaultRaw(),
            limit: 1
        };

        if (unfilteredOptions.transacting) {
            options.transacting = unfilteredOptions.transacting;
        }

        const newsletters = await this.findPage(options);

        if (newsletters.data.length > 0) {
            return newsletters.data[0];
        }
        return null;
    },

    getNextAvailableSortOrder: async function getNextAvailableSortOrder(unfilteredOptions = {}) {
        const options = {
            filter: 'status:active',
            order: 'sort_order DESC', // there's no NQL syntax available here
            limit: 1,
            columns: ['sort_order']
        };

        if (unfilteredOptions.transacting) {
            options.transacting = unfilteredOptions.transacting;
        }

        const lastNewsletter = await this.findPage(options);

        if (lastNewsletter.data.length > 0) {
            return lastNewsletter.data[0].get('sort_order') + 1;
        }
        return 0;
    }
});

module.exports = {
    Newsletter: ghostBookshelf.model('Newsletter', Newsletter)
};
