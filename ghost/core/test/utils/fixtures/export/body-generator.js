const _ = require('lodash');

const exportedBodyV2 = () => {
    return _.clone({
        db: [{
            meta: {
                exported_on: 1504269105806,
                version: '2.0.0'
            },
            data: {
                app_fields: [],
                app_settings: [],
                apps: [],
                brute: [],
                invites: [],
                migrations: [],
                permissions: [],
                permissions_roles: [],
                permissions_users: [],
                posts: [],
                posts_tags: [],
                posts_authors: [],
                roles: [],
                roles_users: [],
                settings: [],
                subscribers: [],
                tags: [],
                users: []
            }
        }]
    });
};

const exportedBodyV1 = () => {
    return _.clone({
        db: [{
            meta: {
                exported_on: 1504269105806,
                version: '1.20.0'
            },
            data: {
                app_fields: [],
                app_settings: [],
                apps: [],
                brute: [],
                invites: [],
                migrations: [],
                permissions: [],
                permissions_roles: [],
                permissions_users: [],
                posts: [],
                posts_tags: [],
                posts_authors: [],
                roles: [],
                roles_users: [],
                settings: [],
                subscribers: [],
                tags: [],
                users: []
            }
        }]
    });
};

const exportedBodyLegacy = () => {
    return _.clone({
        db: [{
            meta: {
                exported_on: 1504269105806,
                version: '300'
            },
            data: {
                app_fields: [],
                app_settings: [],
                apps: [],
                brute: [],
                invites: [],
                permissions: [],
                permissions_roles: [],
                permissions_users: [],
                posts: [],
                posts_tags: [],
                roles: [],
                roles_users: [],
                settings: [],
                subscribers: [],
                tags: [],
                users: []
            }
        }]
    });
};

const exportedBodyV4 = () => {
    return _.clone({
        db: [{
            meta: {
                exported_on: 1615520875631,
                version: '4.0.0'
            },
            data: {
                actions: [],
                api_keys: [],
                brute: [],
                emails: [],
                integrations: [],
                invites: [],
                labels: [],
                members: [],
                members_labels: [],
                members_stripe_customers: [],
                members_stripe_customers_subscriptions: [],
                migrations: [],
                migrations_lock: [],
                permissions: [],
                permissions_roles: [],
                permissions_users: [],
                posts: [],
                posts_authors: [],
                posts_meta: [],
                posts_tags: [],
                roles: [],
                roles_users: [],
                settings: [],
                snippets: [],
                tags: [],
                tokens: [],
                users: [],
                webhooks: []
            }
        }]
    });
};

// NOTE: clone the fixture before changing in and alias to v5, v6 or whatever the newest version is
const exportedBodyLatest = () => {
    return _.clone({
        db: [{
            meta: {
                exported_on: 1615520875631,
                version: '4.1.2'
            },
            data: {
                benefits: [],
                custom_theme_settings: [],
                newsletters: [],
                offers: [],
                offer_redemptions: [],
                posts: [],
                posts_authors: [],
                posts_meta: [],
                posts_products: [],
                posts_tags: [],
                products: [],
                products_benefits: [],
                roles: [],
                roles_users: [],
                settings: [],
                snippets: [],
                stripe_prices: [],
                stripe_products: [],
                tags: [],
                users: []
            }
        }]
    });
};

module.exports.exportedBodyLatest = exportedBodyLatest;
module.exports.exportedBodyV4 = exportedBodyV4;
module.exports.exportedBodyV2 = exportedBodyV2;
module.exports.exportedBodyV1 = exportedBodyV1;
module.exports.exportedBodyLegacy = exportedBodyLegacy;
