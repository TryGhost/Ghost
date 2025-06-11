const ghostBookshelf = require('./base');
const crypto = require('crypto');
const _ = require('lodash');
const config = require('../../shared/config');

const Member = ghostBookshelf.Model.extend({
    tableName: 'members',

    defaults() {
        return {
            status: 'free',
            uuid: crypto.randomUUID(),
            transient_id: crypto.randomUUID(),
            email_count: 0,
            email_opened_count: 0,
            enable_comment_notifications: true
        };
    },

    filterExpansions() {
        return [{
            key: 'label',
            replacement: 'labels.slug'
        }, {
            key: 'labels',
            replacement: 'labels.slug'
        }, {
            key: 'product',
            replacement: 'products.slug'
        }, {
            key: 'products',
            replacement: 'products.slug'
        }, {
            key: 'tier',
            replacement: 'products.slug'
        }, {
            key: 'tiers',
            replacement: 'products.slug'
        }, {
            key: 'tier_id',
            replacement: 'products.id'
        },{
            key: 'newsletters',
            replacement: 'newsletters.slug'
        }, {
            key: 'signup',
            replacement: 'signups.attribution_id'
        }, {
            key: 'conversion',
            replacement: 'conversions.attribution_id'
        }, {
            key: 'opened_emails.post_id',
            replacement: 'emails.post_id',
            // Currently we cannot expand on values such as null or a string in mongo-knex
            // But the line below is essentially the same as: `email_recipients.opened_at:-null`
            expansion: 'email_recipients.opened_at:>=0'
        }, {
            key: 'offer_redemptions',
            replacement: 'offer_redemptions.offer_id'
        }];
    },

    filterRelations() {
        return {
            labels: {
                tableName: 'labels',
                type: 'manyToMany',
                joinTable: 'members_labels',
                joinFrom: 'member_id',
                joinTo: 'label_id'
            },
            products: {
                tableName: 'products',
                type: 'manyToMany',
                joinTable: 'members_products',
                joinFrom: 'member_id',
                joinTo: 'product_id'
            },
            newsletters: {
                tableName: 'newsletters',
                type: 'manyToMany',
                joinTable: 'members_newsletters',
                joinFrom: 'member_id',
                joinTo: 'newsletter_id'
            },
            subscriptions: {
                tableName: 'members_stripe_customers_subscriptions',
                tableNameAs: 'subscriptions',
                type: 'manyToMany',
                joinTable: 'members_stripe_customers',
                joinFrom: 'member_id',
                joinTo: 'customer_id',
                joinToForeign: 'customer_id'
            },
            signups: {
                tableName: 'members_created_events',
                tableNameAs: 'signups',
                type: 'oneToOne',
                joinFrom: 'member_id'
            },
            conversions: {
                tableName: 'members_subscription_created_events',
                tableNameAs: 'conversions',
                type: 'oneToOne',
                joinFrom: 'member_id'
            },
            clicked_links: {
                tableName: 'redirects',
                tableNameAs: 'clicked_links',
                type: 'manyToMany',
                joinTable: 'members_click_events',
                joinFrom: 'member_id',
                joinTo: 'redirect_id'
            },
            emails: {
                tableName: 'emails',
                tableNameAs: 'emails',
                type: 'manyToMany',
                joinTable: 'email_recipients',
                joinFrom: 'member_id',
                joinTo: 'email_id'
            },
            feedback: {
                tableName: 'members_feedback',
                tableNameAs: 'feedback',
                type: 'oneToOne',
                joinFrom: 'member_id'
            },
            offer_redemptions: {
                tableName: 'offer_redemptions',
                type: 'oneToOne',
                joinFrom: 'member_id'
            }
        };
    },

    relationships: ['products', 'labels', 'stripeCustomers', 'email_recipients', 'newsletters'],

    // do not delete email_recipients records when a member is destroyed. Recipient
    // records are used for analytics and historical records
    relationshipConfig: {
        products: {
            editable: true
        },
        labels: {
            editable: true
        },
        email_recipients: {
            destroyRelated: false
        }
    },

    relationshipBelongsTo: {
        products: 'products',
        newsletters: 'newsletters',
        labels: 'labels',
        stripeCustomers: 'members_stripe_customers',
        email_recipients: 'email_recipients',
        offers: 'offers'
    },

    productEvents() {
        return this.hasMany('MemberProductEvent', 'member_id', 'id')
            .query('orderBy', 'created_at', 'DESC');
    },

    products() {
        return this.belongsToMany('Product', 'members_products', 'member_id', 'product_id')
            .withPivot('sort_order', 'expiry_at')
            .query('orderBy', 'sort_order', 'ASC')
            .query((qb) => {
                // avoids bookshelf adding a `DISTINCT` to the query
                // we know the result set will already be unique and DISTINCT hurts query performance
                qb.columns('products.*', 'expiry_at');
            });
    },

    newsletters() {
        return this.belongsToMany('Newsletter', 'members_newsletters', 'member_id', 'newsletter_id')
            .query('orderBy', 'newsletters.sort_order', 'ASC')
            .query((qb) => {
                // avoids bookshelf adding a `DISTINCT` to the query
                // we know the result set will already be unique and DISTINCT hurts query performance
                qb.columns('newsletters.*');
            });
    },

    offerRedemptions() {
        return this.hasMany('OfferRedemption', 'member_id', 'id')
            .query('orderBy', 'created_at', 'DESC');
    },

    labels: function labels() {
        return this.belongsToMany('Label', 'members_labels', 'member_id', 'label_id')
            .withPivot('sort_order')
            .query('orderBy', 'sort_order', 'ASC')
            .query((qb) => {
                // avoids bookshelf adding a `DISTINCT` to the query
                // we know the result set will already be unique and DISTINCT hurts query performance
                qb.columns('labels.*');
            });
    },

    stripeCustomers() {
        return this.hasMany('MemberStripeCustomer', 'member_id', 'id');
    },

    stripeSubscriptions() {
        return this.belongsToMany(
            'StripeCustomerSubscription',
            'members_stripe_customers',
            'member_id',
            'customer_id',
            'id',
            'customer_id'
        );
    },

    email_recipients() {
        return this.hasMany('EmailRecipient', 'member_id', 'id');
    },

    async updateTierExpiry(products = [], options = {}) {
        for (const product of products) {
            if (product?.id) {
                const expiry = product.expiry_at ? new Date(product.expiry_at) : null;
                const queryOptions = _.extend({}, options, {
                    query: {where: {product_id: product.id}}
                });
                await this.products().updatePivot({expiry_at: expiry}, queryOptions);
            }
        }
    },

    serialize(options) {
        const defaultSerializedObject = ghostBookshelf.Model.prototype.serialize.call(this, options);

        if (defaultSerializedObject.stripeSubscriptions) {
            defaultSerializedObject.subscriptions = defaultSerializedObject.stripeSubscriptions;
            delete defaultSerializedObject.stripeSubscriptions;
        }

        return defaultSerializedObject;
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'member' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
    },

    onDestroying: function onDestroyed(model) {
        ghostBookshelf.Model.prototype.onDestroying.apply(this, arguments);

        this.handleAttachedModels(model);
    },

    onSaving: function onSaving(model, attr, options) {
        let labelsToSave = [];

        if (_.isUndefined(this.get('labels'))) {
            this.unset('labels');
            return;
        }

        // CASE: detect lowercase/uppercase label slugs
        if (!_.isUndefined(this.get('labels')) && !_.isNull(this.get('labels'))) {
            labelsToSave = [];

            //  and deduplicate upper/lowercase tags
            _.each(this.get('labels'), function each(item) {
                item.name = item.name && item.name.trim();
                for (let i = 0; i < labelsToSave.length; i = i + 1) {
                    if (labelsToSave[i].name && item.name && labelsToSave[i].name.toLocaleLowerCase() === item.name.toLocaleLowerCase()) {
                        return;
                    }
                }

                labelsToSave.push(item);
            });

            this.set('labels', labelsToSave);
        }

        this.handleAttachedModels(model);

        // CASE: Detect existing labels with same case-insensitive name and replace
        return ghostBookshelf.model('Label')
            .findAll(Object.assign({
                columns: ['id', 'name']
            }, _.pick(options, 'transacting')))
            .then((labels) => {
                labelsToSave.forEach((label) => {
                    let existingLabel = labels.find((lab) => {
                        return label.name.toLowerCase() === lab.get('name').toLowerCase();
                    });
                    label.name = (existingLabel && existingLabel.get('name')) || label.name;
                    label.id = (existingLabel && existingLabel.id) || label.id;
                });

                model.set('labels', labelsToSave);
            });
    },

    handleAttachedModels: function handleAttachedModels(model) {
        /**
         * @NOTE:
         * Bookshelf only exposes the object that is being detached on `detaching`.
         * For the reason above, `detached` handler is using the scope of `detaching`
         * to access the models that are not present in `detached`.
         */
        model.related('labels').once('detaching', function onDetaching(collection, label) {
            model.related('labels').once('detached', function onDetached(detachedCollection, response, options) {
                label.emitChange('detached', options);
                model.emitChange('label.detached', options);
            });
        });

        model.related('labels').once('attaching', function onDetaching(collection, labels) {
            model.related('labels').once('attached', function onDetached(detachedCollection, response, options) {
                labels.forEach((label) => {
                    label.emitChange('attached', options);
                    model.emitChange('label.attached', options);
                });
            });
        });
    },

    /**
     * The base model keeps only the columns, which are defined in the schema.
     * We have to add the relations on top, otherwise bookshelf-relations
     * has no access to the nested relations, which should be updated.
     */
    permittedAttributes: function permittedAttributes() {
        let filteredKeys = ghostBookshelf.Model.prototype.permittedAttributes.apply(this, arguments);

        this.relationships.forEach((key) => {
            filteredKeys.push(key);
        });

        return filteredKeys;
    },

    /**
     * We have to ensure consistency. If you listen on model events (e.g. `member.added`), you can expect that you always
     * receive all fields including relations. Otherwise you can't rely on a consistent flow. And we want to avoid
     * that event listeners have to re-fetch a resource. This function is used in the context of inserting
     * and updating resources. We won't return the relations by default for now.
     */
    defaultRelations: function defaultRelations(methodName, options) {
        if (['edit', 'add', 'destroy'].indexOf(methodName) !== -1) {
            options.withRelated = _.union(['labels'], options.withRelated || []);
        }

        return options;
    },

    searchQuery: function searchQuery(queryBuilder, query) {
        queryBuilder.where(function () {
            this.where('members.name', 'like', `%${query}%`)
                .orWhere('members.email', 'like', `%${query}%`);
        });
    },

    orderRawQuery(field, direction) {
        if (field === 'email_open_rate') {
            return {
                orderByRaw: `members.email_open_rate IS NOT NULL DESC, members.email_open_rate ${direction}`
            };
        }
    },

    toJSON(unfilteredOptions) {
        const attrs = ghostBookshelf.Model.prototype.toJSON.call(this, unfilteredOptions);

        // Inject a computed avatar url. Uses gravatar's default ?d= query param
        // to serve a blank image if there is no gravatar for the member's email.
        // Will not use gravatar if privacy.useGravatar is false in config
        attrs.avatar_image = null;
        if (attrs.email && !config.isPrivacyDisabled('useGravatar')) {
            const {gravatar} = require('../lib/image');
            attrs.avatar_image = gravatar.url(attrs.email, {size: 250, default: 'blank'});
        }

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

        if (['findPage', 'findAll'].includes(methodName)) {
            options = options.concat(['search']);
        }

        return options;
    },

    add(data, unfilteredOptions = {}) {
        if (!unfilteredOptions.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                return this.add(data, Object.assign({transacting}, unfilteredOptions));
            });
        }

        return ghostBookshelf.Model.add.call(this, data, unfilteredOptions).then(async (member) => {
            if (data.products) {
                await member.updateTierExpiry(data.products, _.pick(unfilteredOptions, 'transacting'));
            }
            return member;
        });
    },

    edit(data, unfilteredOptions = {}) {
        if (!unfilteredOptions.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                return this.edit(data, Object.assign({transacting}, unfilteredOptions));
            });
        }

        return ghostBookshelf.Model.edit.call(this, data, unfilteredOptions).then(async (member) => {
            if (data.products) {
                await member.updateTierExpiry(data.products, _.pick(unfilteredOptions, 'transacting'));
            }
            return member;
        });
    },

    destroy(unfilteredOptions = {}) {
        if (!unfilteredOptions.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                return this.destroy(Object.assign({transacting}, unfilteredOptions));
            });
        }
        return ghostBookshelf.Model.destroy.call(this, unfilteredOptions);
    },

    getLabelRelations(data, unfilteredOptions = {}) {
        const query = ghostBookshelf.knex('members_labels')
            .select('id')
            .where('label_id', data.labelId)
            .whereIn('member_id', data.memberIds);

        if (unfilteredOptions.transacting) {
            query.transacting(unfilteredOptions.transacting);
        }

        return query;
    },

    fetchAllSubscribed(unfilteredOptions = {}) {
        // we use raw queries instead of model relationships because model hydration is expensive
        const query = ghostBookshelf.knex('members_newsletters')
            .join('newsletters', 'members_newsletters.newsletter_id', '=', 'newsletters.id')
            .join('members', 'members_newsletters.member_id', '=', 'members.id')
            .where({
                'newsletters.status': 'active',
                'members.email_disabled': false
            })
            .distinct('member_id as id');

        if (unfilteredOptions.transacting) {
            query.transacting(unfilteredOptions.transacting);
        }

        return query;
    }
});

const Members = ghostBookshelf.Collection.extend({
    model: Member
});

module.exports = {
    Member: ghostBookshelf.model('Member', Member),
    Members: ghostBookshelf.collection('Members', Members)
};
