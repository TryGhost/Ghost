const ghostBookshelf = require('./base');

const Outbox = ghostBookshelf.Model.extend({
    tableName: 'outbox'
});

module.exports = {
    Outbox: ghostBookshelf.model('Outbox', Outbox)
};