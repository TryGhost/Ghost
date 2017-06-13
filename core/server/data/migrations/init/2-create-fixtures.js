var Promise = require('bluebird'),
    _ = require('lodash'),
    fixtures = require('../../schema/fixtures'),
    logging = require('../../../logging'),
    moment = require('moment');

module.exports = function insertFixtures(options) {
    var localOptions = _.merge({
        context: {internal: true}
    }, options);

    return Promise.mapSeries(fixtures.models, function (model) {
        logging.info('Model: ' + model.name);

        // The Post model fixtures need a `published_at` date, where at least the seconds
        // are different, otherwise `prev_post` and `next_post` helpers won't workd with
        // them.
        if (model.name === 'Post') {
            _.forEach(model.entries, function (post, index) {
                post.published_at = moment().add(index, 'seconds');
            });
        }
        return fixtures.utils.addFixturesForModel(model, localOptions);
    }).then(function () {
        return Promise.mapSeries(fixtures.relations, function (relation) {
            logging.info('Relation: ' + relation.from.model + ' to ' + relation.to.model);
            return fixtures.utils.addFixturesForRelation(relation, localOptions);
        });
    });
};
