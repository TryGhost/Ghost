const Promise = require('bluebird');
const _ = require('lodash');
const common = require('../lib/common');
const constants = require('../lib/constants');
const security = require('../lib/security');
const settingsCache = require('../services/settings/cache');
const ghostBookshelf = require('./base');

let Invite,
    Invites;

Invite = ghostBookshelf.Model.extend({
    tableName: 'invites',

    toJSON: function (unfilteredOptions) {
        var options = Invite.filterOptions(unfilteredOptions, 'toJSON'),
            attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        delete attrs.token;
        return attrs;
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {};
    },

    add: function add(data, unfilteredOptions) {
        const options = Invite.filterOptions(unfilteredOptions, 'add');
        data = data || {};

        if (!options.context || !options.context.internal) {
            data.status = 'pending';
        }

        data.expires = Date.now() + constants.ONE_WEEK_MS;
        data.token = security.tokens.generateFromEmail({
            email: data.email,
            expires: data.expires,
            secret: settingsCache.get('db_hash')
        });

        return ghostBookshelf.Model.add.call(this, data, options);
    },

    permissible(inviteModel, action, context, unsafeAttrs, loadedPermissions, hasUserPermission, hasAppPermission, hasApiKeyPermission) {
        const isAdd = (action === 'add');

        if (!isAdd) {
            if (hasUserPermission && hasAppPermission && hasApiKeyPermission) {
                return Promise.resolve();
            }

            return Promise.reject(new common.errors.NoPermissionError({
                message: common.i18n.t('errors.models.invite.notEnoughPermission')
            }));
        }

        // CASE: make sure user is allowed to add a user with this role
        return ghostBookshelf.model('Role')
            .findOne({id: unsafeAttrs.role_id})
            .then((roleToInvite) => {
                if (!roleToInvite) {
                    return Promise.reject(new common.errors.NotFoundError({
                        message: common.i18n.t('errors.api.invites.roleNotFound')
                    }));
                }

                if (roleToInvite.get('name') === 'Owner') {
                    return Promise.reject(new common.errors.NoPermissionError({
                        message: common.i18n.t('errors.api.invites.notAllowedToInviteOwner')
                    }));
                }

                let allowed = [];

                if (_.some(loadedPermissions.user.roles, {name: 'Owner'}) ||
                    _.some(loadedPermissions.user.roles, {name: 'Administrator'})) {
                    allowed = ['Administrator', 'Editor', 'Author', 'Contributor'];
                } else if (_.some(loadedPermissions.user.roles, {name: 'Editor'})) {
                    allowed = ['Author', 'Contributor'];
                }

                if (allowed.indexOf(roleToInvite.get('name')) === -1) {
                    throw new common.errors.NoPermissionError({
                        message: common.i18n.t('errors.api.invites.notAllowedToInvite')
                    });
                }

                if (hasUserPermission && hasAppPermission && hasApiKeyPermission) {
                    return Promise.resolve();
                }

                return Promise.reject(new common.errors.NoPermissionError({
                    message: common.i18n.t('errors.models.invite.notEnoughPermission')
                }));
            });
    }
});

Invites = ghostBookshelf.Collection.extend({
    model: Invite
});

module.exports = {
    Invite: ghostBookshelf.model('Invite', Invite),
    Invites: ghostBookshelf.collection('Invites', Invites)
};
