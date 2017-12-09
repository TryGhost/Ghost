/**
 * # Utils
 * Parts of the model code which can be split out and unit tested
 */
var _ = require('lodash'),
    Promise = require('bluebird'),
    ObjectId = require('bson-objectid'),
    common = require('../../lib/common'),
    attach, detach, actorIs;

/**
 * Attach wrapper (please never call attach manual!)
 *
 * We register the creating event to be able to hook into the model creation process of Bookshelf.
 * We need to load the model again, because of a known bookshelf issue:
 * see https://github.com/tgriesser/bookshelf/issues/629
 * (withRelated option causes a null value for the foreign key)
 *
 * roles [1,2]
 * roles [{id: 1}, {id: 2}]
 * roles [{role_id: 1}]
 * roles [BookshelfModel]
 */
attach = function attach(Model, effectedModelId, relation, modelsToAttach, options) {
    options = options || {};

    var fetchedModel,
        localOptions = {transacting: options.transacting};

    return Model.forge({id: effectedModelId}).fetch(localOptions)
        .then(function successFetchedModel(_fetchedModel) {
            fetchedModel = _fetchedModel;

            if (!fetchedModel) {
                throw new common.errors.NotFoundError({level: 'critical', help: effectedModelId});
            }

            fetchedModel.related(relation).on('creating', function (collection, data) {
                data.id = ObjectId.generate();
            });

            return Promise.resolve(modelsToAttach)
                .then(function then(models) {
                    models = _.map(models, function mapper(model) {
                        if (model.id) {
                            return model.id;
                        } else if (!_.isObject(model)) {
                            return model.toString();
                        } else {
                            return model;
                        }
                    });

                    return fetchedModel.related(relation).attach(models, localOptions);
                });
        })
        .finally(function () {
            if (!fetchedModel) {
                return;
            }

            fetchedModel.related(relation).off('creating');
        });
};

detach = function detach(Model, effectedModelId, relation, modelsToAttach, options) {
    options = options || {};

    var fetchedModel,
        localOptions = {transacting: options.transacting};

    return Model.forge({id: effectedModelId}).fetch(localOptions)
        .then(function successFetchedModel(_fetchedModel) {
            fetchedModel = _fetchedModel;

            if (!fetchedModel) {
                throw new common.errors.NotFoundError({level: 'critical', help: effectedModelId});
            }

            return Promise.resolve(modelsToAttach)
                .then(function then(models) {
                    models = _.map(models, function mapper(model) {
                        if (model.id) {
                            return model.id;
                        } else if (!_.isObject(model)) {
                            return model.toString();
                        } else {
                            return model;
                        }
                    });

                    return fetchedModel.related(relation).detach(models, localOptions);
                });
        });
};

/**
 * Utility function used by the various model permission hooks
 * to determine whether or not a user has a particular role
 */
actorIs = function actorIs(user, roles) {
    return user && _.some(user.roles, _.isArray(roles) ? function (role) {
        return _.includes(roles, role.name);
    } : ['name', roles]);
};

module.exports.attach = attach;
module.exports.detach = detach;
module.exports.actorIs = actorIs;
