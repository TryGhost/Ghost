// Utility Packages
const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const ObjectId = require('bson-objectid').default;
const KnexMigrator = require('knex-migrator');
const {sequence} = require('@tryghost/promise');
const knexMigrator = new KnexMigrator();

// Ghost Internals
const models = require('../../core/server/models');
const {fixtureManager} = require('../../core/server/data/schema/fixtures');
const permissions = require('../../core/server/services/permissions');
const settingsService = require('../../core/server/services/settings/settings-service');
const labsService = require('../../core/shared/labs');

// Other Test Utilities
const context = require('./fixtures/context');
const DataGenerator = require('./fixtures/data-generator');
const filterData = require('./fixtures/filter-param');

let postsInserted = 0;

/** TEST FIXTURES **/
const fixtures = {
    insertPosts: function insertPosts(posts) {
        const tasks = posts.map(post => () => {
            return models.Post.add(post, context.internal);
        });

        return sequence(tasks);
    },

    insertPostsAndTags: function insertPostsAndTags() {
        return Promise.all(DataGenerator.forKnex.tags.map((tag) => {
            return models.Tag.add(tag, context.internal);
        }))
            .then(function () {
                return sequence(_.cloneDeep(DataGenerator.forKnex.posts).map(post => () => {
                    let postTagRelations = _.filter(DataGenerator.forKnex.posts_tags, {post_id: post.id});
                    let postAuthorsRelations = _.filter(DataGenerator.forKnex.posts_authors, {post_id: post.id});

                    postTagRelations = _.map(postTagRelations, function (postTagRelation) {
                        return _.find(DataGenerator.forKnex.tags, {id: postTagRelation.tag_id});
                    });

                    postAuthorsRelations = _.map(postAuthorsRelations, function (postAuthorsRelation) {
                        return _.find(DataGenerator.forKnex.users, {id: postAuthorsRelation.author_id});
                    });

                    post.tags = postTagRelations;
                    post.authors = postAuthorsRelations;

                    return models.Post.add(post, context.internal);
                }));
            })
            .then(function () {
                return Promise.all(DataGenerator.forKnex.posts_meta.map((postMeta) => {
                    return models.PostsMeta.add(postMeta, context.internal);
                }));
            });
    },

    insertMultiAuthorPosts: function insertMultiAuthorPosts() {
        let i;
        let k = 0;
        let posts = [];

        // NOTE: this variable should become a parameter as test logic depends on it
        const count = 10;

        // insert users of different roles
        return Promise.resolve(fixtures.createUsersWithRoles()).then(function () {
            return Promise.all(DataGenerator.forKnex.tags.map((tag) => {
                return models.Tag.add(tag, context.internal);
            }));
        }).then(function () {
            return Promise.all([
                models.User.fetchAll(_.merge({columns: ['id']}, context.internal)),
                models.Tag.fetchAll(_.merge({columns: ['id']}, context.internal))
            ]);
        }).then(function (results) {
            let users = results[0];
            let tags = results[1];

            tags = tags.toJSON();

            users = users.toJSON();
            users = _.map(users, 'id');

            // Let's insert posts with random authors
            for (i = 0; i < count; i += 1) {
                const author = users[i % users.length];
                posts.push(DataGenerator.forKnex.createGenericPost(k, null, null, [{id: author}]));
                k = k + 1;
            }

            return Promise.all(posts.map((post, index) => {
                posts[index].authors = [{id: posts[index].authors[0].id}];
                posts[index].tags = [tags[Math.floor(Math.random() * (tags.length - 1))]];
                return models.Post.add(posts[index], context.internal);
            }));
        });
    },

    insertEmailedPosts: function insertEmailedPosts({postCount = 2} = {}) {
        const posts = [];

        for (let i = 0; i < postCount; i++) {
            posts.push(DataGenerator.forKnex.createGenericPost);
        }
    },

    insertExtraPosts: function insertExtraPosts(max) {
        let lang;
        let status;
        const posts = [];
        let i;
        let j;
        let k = postsInserted;

        max = max || 50;

        for (i = 0; i < 2; i += 1) {
            lang = i % 2 ? 'en' : 'fr';
            posts.push(DataGenerator.forKnex.createGenericPost(k, null, lang));
            k = k + 1;

            for (j = 0; j < max; j += 1) {
                status = j % 2 ? 'draft' : 'published';
                posts.push(DataGenerator.forKnex.createGenericPost(k, status, lang));
                k = k + 1;
            }
        }

        // Keep track so we can run this function again safely
        postsInserted = k;

        return models.User.getOwnerUser(context.internal)
            .then(function (ownerUser) {
                return Promise.all(posts.map((post, index) => {
                    posts[index].authors = [ownerUser.toJSON()];
                    return models.Post.add(posts[index], context.internal);
                }));
            });
    },

    insertTags: function insertTags() {
        return Promise.all(DataGenerator.forKnex.tags.map((tag) => {
            return models.Tag.add(tag, context.internal);
        }));
    },

    insertExtraTags: function insertExtraTags(max) {
        max = max || 50;
        const tags = [];
        let tagName;
        let i;

        for (i = 0; i < max; i += 1) {
            tagName = crypto.randomUUID().split('-')[0];
            tags.push(DataGenerator.forKnex.createBasic({name: tagName, slug: tagName}));
        }

        return Promise.all(tags.map((tag, index) => {
            return models.Tag.add(tags[index], context.internal);
        }));
    },

    insertExtraPostsTags: function insertExtraPostsTags(max) {
        max = max || 50;

        return Promise.all([
            models.Post.fetchAll(_.merge({columns: ['id'], withRelated: 'tags'}, context.internal)),
            models.Tag.fetchAll(_.merge({columns: ['id', 'name']}, context.internal))
        ]).then(function (results) {
            let posts = results[0].toJSON();
            let tags = results[1].toJSON();

            const injectionTagId = _.chain(tags)
                .filter({name: 'injection'})
                .map('id')
                .value()[0];

            if (max > posts.length) {
                throw new Error('Trying to add more posts_tags than the number of posts.');
            }

            return models.Base.transaction((transacting) => {
                return Promise.all(posts.slice(0, max).map((post) => {
                    post.tags = post.tags ? post.tags : [];

                    return models.Post.edit({
                        tags: post.tags.concat([_.find(DataGenerator.Content.tags, {id: injectionTagId})])
                    }, _.merge({id: post.id, transacting}, context.internal));
                }));
            });
        });
    },

    insertRoles: function insertRoles() {
        return Promise.all(DataGenerator.forKnex.roles.map((role) => {
            return models.Role.add(role, context.internal);
        }));
    },

    initOwnerUser: function initOwnerUser() {
        let user = DataGenerator.Content.users[0];

        user = DataGenerator.forKnex.createBasic(user);
        user = _.extend({}, user, {status: 'inactive'});

        return Promise.all(DataGenerator.forKnex.roles.map((role) => {
            return models.Role.add(role, context.internal);
        })).then(function () {
            const userRolesRelation = _.cloneDeep(DataGenerator.forKnex.roles_users[0]);
            user.roles = _.filter(DataGenerator.forKnex.roles, {id: userRolesRelation.role_id});
            return models.User.add(user, context.internal);
        });
    },

    insertOwnerUser: function insertOwnerUser() {
        const user = _.cloneDeep(DataGenerator.forKnex.users[0]);
        user.roles = [DataGenerator.forKnex.roles[3]];
        return models.User.add(user, context.internal);
    },

    overrideOwnerUser: function overrideOwnerUser(slug) {
        return models.User.getOwnerUser(context.internal)
            .then(function (ownerUser) {
                const user = DataGenerator.forKnex.createUser(DataGenerator.Content.users[0]);

                if (slug) {
                    user.slug = slug;
                }

                return models.User.edit(user, _.merge({id: ownerUser.id}, context.internal));
            });
    },

    changeOwnerUserStatus: function changeOwnerUserStatus(options) {
        return models.User.getOwnerUser(context.internal)
            .then(function (user) {
                return models.User.edit({status: options.status}, _.merge({id: user.id}, context.internal));
            });
    },

    createUsersWithRoles: function createUsersWithRoles() {
        return Promise.all(DataGenerator.forKnex.roles.map((role) => {
            return models.Role.add(role, context.internal);
        })).then(function () {
            return Promise.all(_.cloneDeep(DataGenerator.forKnex.users).map((user) => {
                let userRolesRelations = _.filter(DataGenerator.forKnex.roles_users, {user_id: user.id});

                userRolesRelations = _.map(userRolesRelations, function (userRolesRelation) {
                    return _.find(DataGenerator.forKnex.roles, {id: userRolesRelation.role_id});
                });

                user.roles = userRolesRelations;
                return models.User.add(user, context.internal);
            }));
        });
    },

    ensureUserForEachRole: async function ensureUserForEachRole() {
        const usersWithoutOwner = _.cloneDeep(DataGenerator.forKnex.users.slice(1));

        let roles = await models.Role.fetchAll();
        roles = roles.toJSON();

        return Promise.all(usersWithoutOwner.map((user) => {
            let userRolesRelations = _.filter(DataGenerator.forKnex.roles_users, {user_id: user.id});

            userRolesRelations = _.map(userRolesRelations, function (userRolesRelation) {
                return _.find(roles, {name: userRolesRelation.role_name});
            });

            user.roles = userRolesRelations;

            return models.User.add(user, context.internal);
        }));
    },

    createInactiveUser() {
        const user = DataGenerator.forKnex.createUser({
            email: 'inactive@test.org',
            slug: 'inactive',
            status: 'inactive'
        });

        return models.User.add(user, context.internal);
    },

    createExtraUsers: function createExtraUsers() {
        // grab 3 more users
        let extraUsers = _.cloneDeep(DataGenerator.Content.users.slice(2, 6));
        extraUsers = _.map(extraUsers, function (user) {
            return DataGenerator.forKnex.createUser(_.extend({}, user, {
                id: ObjectId().toHexString(),
                email: 'a' + user.email,
                slug: 'a' + user.slug
            }));
        });

        const roles = {};
        roles[extraUsers[0].id] = DataGenerator.Content.roles[0];
        roles[extraUsers[1].id] = DataGenerator.Content.roles[1];
        roles[extraUsers[2].id] = DataGenerator.Content.roles[2];
        roles[extraUsers[3].id] = DataGenerator.Content.roles[4];

        // @TODO: remove when overhauling test env
        // tests need access to the extra created users (especially to the created id)
        // replacement for admin2, editor2 etc
        DataGenerator.Content.extraUsers = extraUsers;

        return Promise.all(extraUsers.map((user) => {
            user.roles = roles[user.id];
            return models.User.add(user, context.internal);
        }));
    },

    insertOneUser: function insertOneUser(options) {
        options = options || {};

        return models.User.add({
            name: options.name,
            email: options.email,
            slug: options.slug,
            status: options.status
        }, context.internal);
    },

    insertOne: function insertOne(modelName, tableName, fn, index) {
        const obj = DataGenerator.forKnex[fn](DataGenerator.Content[tableName][index || 0]);
        return models[modelName].add(obj, context.internal);
    },

    getImportFixturePath: function (filename) {
        return path.resolve(__dirname + '/fixtures/import/' + filename);
    },

    getExportFixturePath: function (filename) {
        const relativePath = '/fixtures/export/';
        return path.resolve(__dirname + relativePath + filename + '.json');
    },

    loadExportFixture: function loadExportFixture(filename) {
        const filePath = this.getExportFixturePath(filename);

        return fs.readFile(filePath).then(function (fileContents) {
            let data;

            // Parse the json data
            try {
                data = JSON.parse(fileContents);
            } catch (e) {
                return new Error('Failed to parse the file');
            }

            return data;
        });
    },

    permissionsFor: function permissionsFor(obj) {
        let permsToInsert = _.cloneDeep(fixtureManager.findModelFixtures('Permission', {object_type: obj}).entries);
        const permsRolesToInsert = fixtureManager.findPermissionRelationsForObject(obj).entries;
        const actions = [];
        const permissionsRoles = {};

        const roles = {
            Administrator: DataGenerator.Content.roles[0].id,
            Editor: DataGenerator.Content.roles[1].id,
            Author: DataGenerator.Content.roles[2].id,
            Owner: DataGenerator.Content.roles[3].id,
            Contributor: DataGenerator.Content.roles[4].id,
            'Admin Integration': DataGenerator.Content.roles[5].id
        };

        // CASE: if empty db will throw SQLITE_MISUSE, hard to debug
        if (_.isEmpty(permsToInsert)) {
            return Promise.reject(new Error('no permission found:' + obj));
        }

        permsToInsert = _.map(permsToInsert, function (perms) {
            perms.id = ObjectId().toHexString();

            actions.push({type: perms.action_type, permissionId: perms.id});
            return DataGenerator.forKnex.createBasic(perms);
        });

        _.each(permsRolesToInsert, function (perms, role) {
            if (perms[obj]) {
                if (perms[obj] === 'all') {
                    _.each(actions, function (action) {
                        if (!permissionsRoles[action.permissionId]) {
                            permissionsRoles[action.permissionId] = [];
                        }

                        permissionsRoles[action.permissionId].push(_.find(DataGenerator.Content.roles, {id: roles[role]}));
                    });
                } else {
                    _.each(perms[obj], function (action) {
                        if (!permissionsRoles[_.find(actions, {type: action}).permissionId]) {
                            permissionsRoles[_.find(actions, {type: action}).permissionId] = [];
                        }

                        permissionsRoles[_.find(actions, {type: action}).permissionId].push(_.find(DataGenerator.Content.roles, {id: roles[role]}));
                    });
                }
            }
        });

        return Promise.all(permsToInsert.map((perm) => {
            if (!_.isEmpty(permissionsRoles)) {
                perm.roles = permissionsRoles[perm.id];
            }

            return models.Permission.add(perm, context.internal);
        }));
    },

    insertInvites: function insertInvites() {
        return Promise.all(DataGenerator.forKnex.invites.map((invite) => {
            return models.Invite.add(invite, context.internal);
        }));
    },

    insertWebhook: function (attributes) {
        const webhook = DataGenerator.forKnex.createWebhook(
            Object.assign(attributes, {
                integration_id: DataGenerator.forKnex.integrations[0].id
            })
        );

        return models.Webhook.add(webhook, context.internal);
    },

    insertWebhooks: function insertWebhooks() {
        return Promise.all(DataGenerator.forKnex.webhooks.map((webhook) => {
            return models.Webhook.add(webhook, context.internal);
        }));
    },

    insertIntegrations: function insertIntegrations() {
        return Promise.all(DataGenerator.forKnex.integrations.map((integration) => {
            return models.Integration.add(integration, context.internal);
        }));
    },

    insertApiKeys: function insertApiKeys() {
        return Promise.all(DataGenerator.forKnex.api_keys.map((api_key) => {
            return models.ApiKey.add(api_key, context.internal);
        }));
    },

    insertLinks: function insertLinks() {
        return Promise.all(DataGenerator.forKnex.links.map((link) => {
            return models.Redirect.add(link, context.internal);
        }));
    },

    insertMentions: function insertMentions() {
        return Promise.all(DataGenerator.forKnex.mentions.map((mention) => {
            return models.Mention.add(mention, context.internal);
        }));
    },

    insertEmails: function insertEmails() {
        return Promise.all(DataGenerator.forKnex.emails.map((email) => {
            return models.Email.add(email, context.internal);
        }));
    },

    insertArchivedTiers: function insertArchivedTiers() {
        let archivedProduct = DataGenerator.forKnex.createProduct({
            active: false
        });

        return models.Product.add(archivedProduct, context.internal);
    },

    insertHiddenTiers: function insertArchivedTiers() {
        let hiddenTier = DataGenerator.forKnex.createProduct({
            visibility: 'none'
        });

        return models.Product.add(hiddenTier, context.internal);
    },

    insertExtraTiers: async function insertExtraTiers() {
        const extraTier = DataGenerator.forKnex.createProduct({});
        const extraTier2 = DataGenerator.forKnex.createProduct({slug: 'silver', name: 'Silver'});
        await models.Product.add(extraTier, context.internal);
        await models.Product.add(extraTier2, context.internal);
    },

    insertProducts: async function insertProducts() {
        let coreProductFixtures = fixtureManager.findModelFixtures('Product').entries;
        await Promise.all(coreProductFixtures.map(async (product) => {
            const found = await models.Product.findOne(product, context.internal);
            if (!found) {
                await models.Product.add(product, context.internal);
            }
        }));

        const product = await models.Product.findOne({type: 'paid'}, context.internal);

        await sequence(_.cloneDeep(DataGenerator.forKnex.stripe_products).map(stripeProduct => () => {
            stripeProduct.product_id = product.id;
            return models.StripeProduct.add(stripeProduct, context.internal);
        }));

        await sequence(_.cloneDeep(DataGenerator.forKnex.stripe_prices).map(stripePrice => () => {
            return models.StripePrice.add(stripePrice, context.internal);
        }));
    },

    insertMembersAndLabelsAndProducts: function insertMembersAndLabelsAndProducts(newsletters = false) {
        return Promise.all(DataGenerator.forKnex.labels.map((label) => {
            return models.Label.add(label, context.internal);
        })).then(function () {
            let coreProductFixtures = fixtureManager.findModelFixtures('Product').entries;
            return Promise.all(coreProductFixtures.map(async (product) => {
                const found = await models.Product.findOne(product, context.internal);
                if (!found) {
                    await models.Product.add(product, context.internal);
                }
            }));
        }).then(async function () {
            let testProductFixtures = DataGenerator.forKnex.products;
            for (const productFixture of testProductFixtures) {
                if (productFixture.id) { // Not currently used - this is used to add new text fixtures, e.g. a Bronze/Silver/Gold Tier
                    await models.Product.add(productFixture, context.internal);
                } else { // Used to update the core fixtures
                    // If it doesn't exist we have invalid fixtures, so require: true to ensure we throw
                    const existing = await models.Product.findOne({slug: productFixture.slug}, {...context.internal, require: true});
                    await models.Product.edit(productFixture, {...context.internal, id: existing.id});
                }
            }
        }).then(function () {
            return models.Product.findOne({type: 'paid'}, context.internal);
        }).then(function (product) {
            return Promise.all([
                sequence(_.cloneDeep(DataGenerator.forKnex.stripe_products).map(stripeProduct => () => {
                    stripeProduct.product_id = product.id;
                    return models.StripeProduct.add(stripeProduct, context.internal);
                })),
                sequence(_.cloneDeep(DataGenerator.forKnex.members).map(member => () => {
                    let memberLabelRelations = _.filter(DataGenerator.forKnex.members_labels, {member_id: member.id});

                    memberLabelRelations = _.map(memberLabelRelations, function (memberLabelRelation) {
                        return _.find(DataGenerator.forKnex.labels, {id: memberLabelRelation.label_id});
                    });

                    member.labels = memberLabelRelations;

                    if (newsletters) {
                        let memberNewsletterRelations = _.filter(DataGenerator.forKnex.members_newsletters, {member_id: member.id});
                        memberNewsletterRelations = _.map(memberNewsletterRelations, function (memberNewsletterRelation) {
                            return _.find(DataGenerator.forKnex.newsletters, {id: memberNewsletterRelation.newsletter_id});
                        });

                        member.newsletters = memberNewsletterRelations;
                    }

                    // TODO: replace with full member/product associations
                    if (member.email === 'with-product@test.com') {
                        member.products = [{id: product.id}];
                    }

                    return models.Member.add(member, context.internal);
                }))
            ]);
        }).then(function () {
            return sequence(_.cloneDeep(DataGenerator.forKnex.members_stripe_customers).map(customer => () => {
                return models.MemberStripeCustomer.add(customer, context.internal);
            }));
        }).then(function () {
            return sequence(_.cloneDeep(DataGenerator.forKnex.stripe_prices).map(stripePrice => () => {
                return models.StripePrice.add(stripePrice, context.internal);
            }));
        }).then(async function () {
            // Add monthly/yearly prices to default product for testing
            const defaultProduct = await models.Product.findOne({slug: 'default-product'}, context.internal);
            return models.Product.edit({
                ...defaultProduct.toJSON(),
                monthly_price_id: DataGenerator.forKnex.stripe_prices[1].id,
                yearly_price_id: DataGenerator.forKnex.stripe_prices[2].id
            }, _.merge({id: defaultProduct.id}, context.internal));
        }).then(function () {
            return sequence(_.cloneDeep(DataGenerator.forKnex.stripe_customer_subscriptions).map(subscription => () => {
                return models.StripeCustomerSubscription.add(subscription, context.internal);
            }));
        }).then(async function () {
            const members = (await models.Member.findAll({
                withRelated: [
                    'labels',
                    'stripeSubscriptions',
                    'stripeSubscriptions.customer',
                    'stripeSubscriptions.stripePrice',
                    'stripeSubscriptions.stripePrice.stripeProduct',
                    'products',
                    'offerRedemptions'
                ]
            })).toJSON();

            for (const member of members) {
                for (const subscription of member.subscriptions) {
                    const product = subscription.price.product.product_id;
                    await models.Member.edit({products: member.products.concat({
                        id: product
                    })}, {id: member.id});
                }
            }
        }).then(async function () {
            for (const event of DataGenerator.forKnex.members_paid_subscription_events) {
                await models.MemberPaidSubscriptionEvent.add(event);
            }
        }).then(async function () {
            for (const event of DataGenerator.forKnex.members_created_events) {
                await models.MemberCreatedEvent.add(event);
            }
        }).then(async function () {
            for (const event of DataGenerator.forKnex.members_subscription_created_events) {
                await models.SubscriptionCreatedEvent.add(event);
            }
        });
    },

    insertEmailsAndRecipients: function insertEmailsAndRecipients(withFailed = false) {
        // NOTE: This require results in the jobs service being loaded prematurely, which breaks any tests relevant to it.
        //  This MUST be done in here and not at the top of the file to prevent that from happening as test setup is being performed.
        const emailAnalyticsService = require('../../core/server/services/email-analytics');
        return sequence(_.cloneDeep(DataGenerator.forKnex.emails).map(email => () => {
            return models.Email.add(email, context.internal);
        })).then(function () {
            return sequence(_.cloneDeep(DataGenerator.forKnex.email_batches).map(emailBatch => () => {
                return models.EmailBatch.add(emailBatch, context.internal);
            }));
        }).then(function () {
            const email_recipients = withFailed ?
                DataGenerator.forKnex.email_recipients
                : DataGenerator.forKnex.email_recipients.filter(r => r.failed_at === null);

            return sequence(_.cloneDeep(email_recipients).map(emailRecipient => () => {
                return models.EmailRecipient.add(emailRecipient, context.internal);
            }));
        }).then(function () {
            if (!withFailed) {
                return;
            }

            return sequence(_.cloneDeep(DataGenerator.forKnex.email_recipient_failures).map(failure => () => {
                return models.EmailRecipientFailure.add(failure, context.internal);
            }));
        }).then(function () {
            const toAggregate = {
                emailIds: DataGenerator.forKnex.emails.map(email => email.id),
                memberIds: DataGenerator.forKnex.members.map(member => member.id)
            };

            return emailAnalyticsService.service.aggregateStats(toAggregate);
        });
    },

    insertNewsletters: async function insertNewsletters() {
        return Promise.all(DataGenerator.forKnex.newsletters.map((newsletter) => {
            return models.Newsletter.add(newsletter, context.internal);
        }));
    },

    insertComments: async function insertComments() {
        // First create the parents (can happen in parallel), because the children depend on those
        const parents = DataGenerator.forKnex.comments.filter(c => !c.parent_id);
        const children = DataGenerator.forKnex.comments.filter(c => !!c.parent_id);

        await Promise.all(parents.map((comment) => {
            return models.Comment.add(comment, context.internal);
        }));

        await Promise.all(children.map((comment) => {
            return models.Comment.add(comment, context.internal);
        }));
    },

    insertRedirects: async function insertClicks() {
        await Promise.all(DataGenerator.forKnex.redirects.map((click) => {
            return models.Redirect.add(click, context.internal);
        }));
    },

    insertClicks: async function insertClicks() {
        await Promise.all(DataGenerator.forKnex.members_click_events.map((click) => {
            return models.MemberClickEvent.add(click, context.internal);
        }));
    },

    insertFeedback: async function insertFeedback() {
        await Promise.all(DataGenerator.forKnex.members_feedback.map((feedback) => {
            return models.MemberFeedback.add(feedback, context.internal);
        }));
    },

    insertSnippets: function insertSnippets() {
        return Promise.all(DataGenerator.forKnex.snippets.map((snippet) => {
            return models.Snippet.add(snippet, context.internal);
        }));
    },

    insertCustomThemeSettings: function insertCustomThemeSettings() {
        return Promise.all(DataGenerator.forKnex.custom_theme_settings.map((setting) => {
            return models.CustomThemeSetting.add(setting, context.internal);
        }));
    },

    async enableAllLabsFeatures() {
        const labsValue = Object.fromEntries(labsService.WRITABLE_KEYS_ALLOWLIST
            // TODO: should test with 2fa enabled
            .filter(key => key !== 'staff2fa')
            .map(key => [key, true]));
        const labsSetting = DataGenerator.forKnex.createSetting({
            key: 'labs',
            group: 'labs',
            type: 'object',
            value: JSON.stringify(labsValue)
        });

        const existingLabsSetting = await models.Settings.findOne({key: 'labs'});

        if (existingLabsSetting) {
            delete labsSetting.id;
            await models.Settings.edit(labsSetting);
        } else {
            await models.Settings.add(labsSetting);
        }

        await settingsService.init();
    }
};

const toDoList = {
    roles: function insertRoles() {
        return fixtures.insertRoles();
    },
    tag: function insertTag() {
        return fixtures.insertOne('Tag', 'tags', 'createTag');
    },
    member: function insertMember() {
        return fixtures.insertOne('Member', 'members', 'createMember');
    },
    members: function insertMembersAndLabelsAndProducts() {
        return fixtures.insertMembersAndLabelsAndProducts(false);
    },
    products: function insertProducts() {
        return fixtures.insertProducts();
    },
    newsletters: function insertNewsletters() {
        return fixtures.insertNewsletters();
    },
    'members:newsletters': function insertMembersAndLabelsAndProductsAndNewsletters() {
        return fixtures.insertMembersAndLabelsAndProducts(true);
    },
    'members:emails': function insertEmailsAndRecipients() {
        return fixtures.insertEmailsAndRecipients(false);
    },
    'members:emails:failed': function insertEmailsAndRecipients() {
        return fixtures.insertEmailsAndRecipients(true);
    },
    posts: function insertPostsAndTags() {
        return fixtures.insertPostsAndTags();
    },
    'posts:mu': function insertMultiAuthorPosts() {
        return fixtures.insertMultiAuthorPosts();
    },
    tags: function insertTags() {
        return fixtures.insertTags();
    },
    'tags:extra': function insertExtraTags() {
        return fixtures.insertExtraTags();
    },
    settings: function populateSettings() {
        return settingsService.init();
    },
    'users:roles': function createUsersWithRoles() {
        return fixtures.createUsersWithRoles();
    },
    users: function ensureUserForEachRole() {
        return fixtures.ensureUserForEachRole();
    },
    'user:inactive': function createInactiveUser() {
        return fixtures.createInactiveUser();
    },
    'users:extra': function createExtraUsers() {
        return fixtures.createExtraUsers();
    },
    owner: function insertOwnerUser() {
        return fixtures.insertOwnerUser();
    },
    'owner:pre': function initOwnerUser() {
        return fixtures.initOwnerUser();
    },
    'owner:post': function overrideOwnerUser() {
        return fixtures.overrideOwnerUser();
    },
    'perms:init': function initPermissions() {
        return permissions.init();
    },
    perms: function permissionsFor(obj) {
        return fixtures.permissionsFor(obj);
    },
    filter: function createFilterParamFixtures() {
        return filterData(DataGenerator);
    },
    invites: function insertInvites() {
        return fixtures.insertInvites();
    },
    webhooks: function insertWebhooks() {
        return fixtures.insertWebhooks();
    },
    integrations: function insertIntegrations() {
        return fixtures.insertIntegrations();
    },
    api_keys: function insertApiKeys() {
        return fixtures.insertApiKeys();
    },
    emails: function insertEmails() {
        return fixtures.insertEmails();
    },
    snippets: function insertSnippets() {
        return fixtures.insertSnippets();
    },
    'labs:enabled': function enableAllLabsFeatures() {
        return fixtures.enableAllLabsFeatures();
    },
    custom_theme_settings: function insertCustomThemeSettings() {
        return fixtures.insertCustomThemeSettings();
    },
    'tiers:extra': function insertExtraTiers() {
        return fixtures.insertExtraTiers();
    },
    'tiers:archived': function insertArchivedTiers() {
        return fixtures.insertArchivedTiers();
    },
    'tiers:hidden': function insertHiddenTiers() {
        return fixtures.insertHiddenTiers();
    },
    comments: function insertComments() {
        return fixtures.insertComments();
    },
    redirects: function insertRedirects() {
        return fixtures.insertRedirects();
    },
    clicks: function insertClicks() {
        return fixtures.insertClicks();
    },
    feedback: function insertFeedback() {
        return fixtures.insertFeedback();
    },
    links: function insertLinks() {
        return fixtures.insertLinks();
    },
    mentions: function insertMentions() {
        return fixtures.insertMentions();
    }
};

/**
 * ## getFixtureOps
 *
 * Takes the arguments from a setup function and turns them into an array of promises to fullfil
 *
 * This is effectively a list of instructions with regard to which fixtures should be setup for this test.
 *  * `default` - a special option which will cause the full suite of normal fixtures to be initialized
 *  * `perms:init` - initialize the permissions object after having added permissions
 *  * `perms:obj` - initialize permissions for a particular object type
 *  * `users:roles` - create a full suite of users, one per role
 * @param {Object} toDos
 */
const getFixtureOps = (toDos) => {
    // default = default fixtures, if it isn't present, init with tables only
    const tablesOnly = !toDos.default;

    const fixtureOps = [];

    // Database initialization
    if (toDos.init || toDos.default) {
        fixtureOps.push(function initDB() {
            // skip adding all fixtures!
            if (tablesOnly) {
                return knexMigrator.init({skip: 2});
            }

            return knexMigrator.init();
        });

        delete toDos.default;
        delete toDos.init;
    }

    fixtureOps.push(toDoList['labs:enabled']);

    // Go through our list of things to do, and add them to an array
    _.each(toDos, function (value, toDo) {
        let tmp;

        if ((toDo !== 'perms:init' && toDo.indexOf('perms:') !== -1)) {
            tmp = toDo.split(':');

            fixtureOps.push(function addCustomFixture() {
                return toDoList[tmp[0]](tmp[1]);
            });
        } else {
            if (!toDoList[toDo]) {
                throw new Error(`The fixture ${toDo} does not exist.`);
            }

            fixtureOps.push(toDoList[toDo]);
        }
    });

    fixtureOps.push(() => {
        return require('../../core/server/services/tiers').repository?.init();
    });

    return fixtureOps;
};

const getCurrentOwnerUser = async () => {
    return await models.User.getOwnerUser(context.internal);
};

module.exports = {
    fixtures,
    getFixtureOps,
    DataGenerator,
    getCurrentOwnerUser
};
