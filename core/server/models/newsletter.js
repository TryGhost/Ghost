const ghostBookshelf = require('./base');

const Newsletter = ghostBookshelf.Model.extend({
    tableName: 'newsletters'
});

module.exports = {
    Newsletter: ghostBookshelf.model('Newsletter', Newsletter)
};
