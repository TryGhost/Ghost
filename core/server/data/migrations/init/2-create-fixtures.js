const Promise = require('bluebird');
const _ = require('lodash');
const fixtures = require('../../schema/fixtures');
const logging = require('@tryghost/logging');

module.exports.config = {
    transaction: true
};

module.exports.up = function insertFixtures(options) {
    const localOptions = _.merge({
        context: {internal: true},
        migrating: true
    }, options);

    return Promise.mapSeries(fixtures.models, function (model) {
        logging.info('Model: ' + model.name);

        return fixtures.utils.addFixturesForModel(model, localOptions);
    }).then(function () {
        return Promise.mapSeries(fixtures.relations, function (relation) {
            logging.info('Relation: ' + relation.from.model + ' to ' + relation.to.model);
            return fixtures.utils.addFixturesForRelation(relation, localOptions);
        });
    });
};
