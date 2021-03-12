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

module.exports.exportedBodyV2 = exportedBodyV2;
module.exports.exportedBodyV1 = exportedBodyV1;
module.exports.exportedBodyLegacy = exportedBodyLegacy;
