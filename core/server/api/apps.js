var _                  = require('lodash'),
    Promise            = require('bluebird'),
    errors             = require('../errors'),
    dataProvider       = require('../models'),
    utils              = require('./utils'),

    apps,
    allowedIncludes = ['permissions', 'roles', 'roles.permissions'];
 
// ## Helpers
function prepareInclude(include) {
    include = _.intersection(include.split(','), allowedIncludes);
    return include;
}

// ## Change app status
function changeApp(name, status) {
    // ToDo: Fix cyclic dependency and move to top.
    var appLoader = require('../apps/loader');

    if (status === 'active') {
        return appLoader.activateAppByName(name);
    } else {
        return appLoader.deactivateAppByName(name);
    }
}

// ## Apps
apps = {

    // #### Browse
    // **takes:** options object
    browse: function browse(options) {
        // **returns:** a promise for a collection of apps in a json object
        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        return dataProvider.App.findAll(options).then(function (result) {
            return { apps: result.toJSON() };
        });
    },

    // #### Read
    // **takes:** an identifier (id or app-name)
    read: function read(options) {
        if (_.has(options, 'id') && !/^[0-9]+$/.test(options.id)) {
            options.slug = options.id;
            delete options.id;
        }

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        // **returns:** a promise for a single app in a json object
        return dataProvider.App.findOne(options).then(function (result) {
            if (result) {
                return { apps: [result.toJSON()] };
            }

            return Promise.reject(new errors.NotFoundError('App not found'));
        });
    },

    destroy: function destroy(options) {
        return dataProvider.App.findOne(options).then(function (result) {
            return dataProvider.Base.transaction(function (t) {
                options.transacting = t;

                Promise.all([
                    // Set status of app to 'deleted'
                    dataProvider.App.edit({status: 'deleted'}, _.merge({id: result.id }, options)),
                    // Set app_fields to active=false
                    dataProvider.AppField.edit({ active: false }, _.merge({app_id: result.id }, options))
                ]).then(function () {
                    t.commit();
                }).catch(function (error) {
                    t.rollback(error);
                });
            }).then(function () {
                return { apps: [result.toJSON()] };
            }, function (error) {
                return Promise.reject(new errors.InternalServerError(error));
            });
        });
    },

    // #### Edit
    // **takes:** a json object representing an app
    edit: function edit(object, options) {
        // **returns:** a promise for the resulting app in a json object
        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        return dataProvider.App.findOne(options).then(function (result) {
            if (!result) {
                return Promise.reject(new errors.NotFoundError('App not found'));
            }

            return utils.checkObject(object, 'apps').then(function (checkedAppData) {
                // Only the status is editable.
                checkedAppData = _.pick(checkedAppData.apps[0], ['status']);

                // Must have a valid status
                if (!_.contains(['active', 'inactive'], checkedAppData.status)) {
                    return Promise.reject(new errors.BadRequestError('Invalid status given'));
                } else if (checkedAppData.status === result.get('status')) {
                    // No need to edit if status is same
                    return { apps: [result.toJSON()] };
                } else {
                    return changeApp(result.get('name'), checkedAppData.status).then(function () {
                        return dataProvider.App.edit(checkedAppData, options);
                    }).then(function (result) {
                        if (result) {
                            return { apps: [result.toJSON()] };
                        }
                        return Promise.reject(new errors.NotFoundError('App not found'));
                    }).catch(function (error) {
                        console.trace(error);
                        return Promise.reject(new errors.InternalServerError(error));
                    });
                }
            });
        });
    }
};

module.exports = apps;