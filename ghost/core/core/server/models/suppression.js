const ghostBookshelf = require('./base');

const Suppression = ghostBookshelf.Model.extend({
    tableName: 'suppressions'
});

module.exports = {
    Suppression: ghostBookshelf.model('Suppression', Suppression)
};
