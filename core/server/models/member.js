const ghostBookshelf = require('./base');

const Member = ghostBookshelf.Model.extend({
    tableName: 'members'
});

const Members = ghostBookshelf.Collection.extend({
    model: Member
});

module.exports = {
    Member: ghostBookshelf.model('Member', Member),
    Members: ghostBookshelf.collection('Members', Members)
};
