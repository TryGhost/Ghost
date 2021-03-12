const _ = require('lodash');

const exportedLatestBody = () => {
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

const exportedPreviousBody = () => {
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

const exportedLegacyBody = () => {
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

module.exports.exportedLatestBody = exportedLatestBody;
module.exports.exportedPreviousBody = exportedPreviousBody;
module.exports.exportedLegacyBody = exportedLegacyBody;
