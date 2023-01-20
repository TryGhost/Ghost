const ghostBookshelf = require('./base');

const Mention = ghostBookshelf.Model.extend({
    tableName: 'mentions'
});

module.exports = {
    Mention: ghostBookshelf.model('Mention', Mention)
};
