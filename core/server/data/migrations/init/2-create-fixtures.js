const Promise = require('bluebird');
const _ = require('lodash');
const fixtures = require('../../schema/fixtures');
const logging = require('@tryghost/logging');

module.exports.config = {
    transaction: true
};

module.exports.up = async (options) => {
    const localOptions = _.merge({
        context: {internal: true},
        migrating: true
    }, options);

    await Promise.mapSeries(fixtures.models, async (model) => {
        logging.info('Model: ' + model.name);

        await fixtures.utils.addFixturesForModel(model, localOptions);
    });

    await Promise.mapSeries(fixtures.relations, async (relation) => {
        logging.info('Relation: ' + relation.from.model + ' to ' + relation.to.model);
        await fixtures.utils.addFixturesForRelation(relation, localOptions);
    });
};
