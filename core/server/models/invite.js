'use strict';

const crypto = require('crypto'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    common = require('../lib/common'),
    constants = require('../lib/constants'),
    ghostBookshelf = require('./base');

let Invite,
    Invites;

Invite = ghostBookshelf.Model.extend({
    tableName: 'invites',

    toJSON: function (options) {
        options = options || {};

        var attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);
        delete attrs.token;
        return attrs;
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {};
    },

    processOptions: function processOptions(options) {
        return options;
    },

    /**
     * @TODO: can't use base class, because:
     * options.withRelated = _.union(options.withRelated, options.include); is missing
     * there are some weird self implementations in each model
     * so adding this line, will destroy other models, because they rely on something else
     * FIX ME!!!!!
     */
    findOne: function findOne(data, options) {
        options = options || {};

        options = this.filterOptions(options, 'findOne');
        data = this.filterData(data, 'findOne');
        options.withRelated = _.union(options.withRelated, options.include);

        var invite = this.forge(data, {include: options.include});
        return invite.fetch(options);
    },

    add: function add(data, options) {
        var hash = crypto.createHash('sha256'),
            text = '';

        options = this.filterOptions(options, 'add');
        options.withRelated = _.union(options.withRelated, options.include);

        data.expires = Date.now() + constants.ONE_WEEK_MS;
        data.status = 'pending';

        // @TODO: call a util fn?
        hash.update(String(data.expires));
        hash.update(data.email.toLocaleLowerCase());
        text += [data.expires, data.email, hash.digest('base64')].join('|');
        data.token = new Buffer(text).toString('base64');
        return ghostBookshelf.Model.add.call(this, data, options);
    },

    permissible: function permissible(inviteModelOrId, action, context, unsafeAttrs, loadedPermissions) {
        if (action === 'add') {
            return ghostBookshelf.model('Role')
                .findOne({id: unsafeAttrs.role_id})
                .then(function (roleToInvite) {
                    if (!roleToInvite) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.invites.roleNotFound')
                        });
                    }

                    if (roleToInvite.get('name') === 'Owner') {
                        throw new common.errors.NoPermissionError({
                            message: common.i18n.t('errors.api.invites.notAllowedToInviteOwner')
                        });
                    }

                    let allowed = [];

                    if (_.some(loadedPermissions.user.roles, {name: 'Owner'}) ||
                        _.some(loadedPermissions.user.roles, {name: 'Administrator'})) {
                        allowed = ['Administrator', 'Editor', 'Author'];
                    } else if (_.some(loadedPermissions.user.roles, {name: 'Editor'})) {
                        allowed = ['Author'];
                    }

                    if (allowed.indexOf(roleToInvite.get('name')) === -1) {
                        throw new common.errors.NoPermissionError({
                            message: common.i18n.t('errors.api.invites.notAllowedToInvite')
                        });
                    }
                });
        }

        return Promise.resolve();
    }
});

Invites = ghostBookshelf.Collection.extend({
    model: Invite
});

module.exports = {
    Invite: ghostBookshelf.model('Invite', Invite),
    Invites: ghostBookshelf.collection('Invites', Invites)
};
