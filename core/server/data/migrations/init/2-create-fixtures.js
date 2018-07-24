var Promise = require('bluebird'),
    _ = require('lodash'),
    fixtures = require('../../schema/fixtures'),
    common = require('../../../lib/common');

module.exports.config = {
    transaction: true
};

module.exports.up = function insertFixtures(options) {
    var localOptions = _.merge({
        context: {internal: true},
        migrating: true
    }, options);

    return Promise.mapSeries(fixtures.models, function (model) {
        common.logging.info('Model: ' + model.name);

        return fixtures.utils.addFixturesForModel(model, localOptions);
    }).then(function () {
        return Promise.mapSeries(fixtures.relations, function (relation) {
            common.logging.info('Relation: ' + relation.from.model + ' to ' + relation.to.model);
            return fixtures.utils.addFixturesForRelation(relation, localOptions);
        });
    });
};
