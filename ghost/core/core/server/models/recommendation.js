const ghostBookshelf = require('./base');

const Recommendation = ghostBookshelf.Model.extend({
    tableName: 'recommendations',
    defaults: {}
}, {});

module.exports = {
    Recommendation: ghostBookshelf.model('Recommendation', Recommendation)
};
