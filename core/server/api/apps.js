var _                  = require('lodash'),
    when               = require('when'),
//    appLoader          = require('../apps/loader'),
    errors             = require('../errors'),
    dataProvider       = require('../models'),
    canThis            = require('../permissions').canThis,
    utils              = require('./utils'),
    apps;

// ## Apps
apps = {

    // #### Browse
    // **takes:** options object
    browse: function browse(options) {
        // **returns:** a promise for a collection of apps in a json object
        return canThis(this).browse.app().then(function () {
            return dataProvider.App.findAll(options).then(function (result) {
                return { apps: result.toJSON() };
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to browse apps.'));
        });
    },

    // #### Read
    // **takes:** an identifier (id or app-name)
    read: function read(args) {
        if (_.has(args, 'id') && !/^[0-9]+$/.test(args.id)) {
            args = {slug: args.id};
        }

        // **returns:** a promise for a single app in a json object
        return canThis(this).read.app(args).then(function () {
            return dataProvider.App.findOne(args).then(function (result) {
                if (result) {
                    return { apps: [result.toJSON()] };
                }

                return when.reject(new errors.NotFoundError('App not found'));
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to view this app.'));
        });
    },

    destroy: function destroy(options) {
        var self = this;
        return canThis(this).remove.app(options).then(function () {
            return apps.read.call({user: self.user}, options).then(function (result) {
                return dataProvider.App.destroy({id: result.apps[0].id}).then(function () {
                    return result;
                });
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to delete this app.'));
        });
    },

    // #### Edit
    // **takes:** a json object representing an app
    edit: function edit(object, options) {
        // **returns:** a promise for the resulting app in a json object

        return canThis(this).edit.app(object.id).then(function () {
            return utils.checkObject(object, 'apps').then(function (checkedAppData) {
                // Only the status is editable.
                checkedAppData = _.pick(checkedAppData.apps[0], ['id', 'status']);
                return dataProvider.App.edit(checkedAppData, options).then(function (result) {
                    if (result) {
                        return { apps: [result.toJSON()] };
                    }
                    return when.reject(new errors.NoPermissionError('App not found'));
                });
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to edit this app.'));
        });
    }
};

module.exports = apps;