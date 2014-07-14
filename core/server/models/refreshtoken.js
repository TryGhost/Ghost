var ghostBookshelf  = require('./base'),
    Basetoken       = require('./basetoken'),

    Refreshtoken,
    Refreshtokens;

Refreshtoken = Basetoken.extend({
    tableName: 'refreshtokens'
});

Refreshtokens = ghostBookshelf.Collection.extend({
    model: Refreshtoken
});

module.exports = {
    Refreshtoken: ghostBookshelf.model('Refreshtoken', Refreshtoken),
    Refreshtokens: ghostBookshelf.collection('Refreshtokens', Refreshtokens)
};