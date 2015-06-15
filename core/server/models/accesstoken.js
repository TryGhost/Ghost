var ghostBookshelf  = require('./base'),
    Basetoken       = require('./base/token'),

    Accesstoken,
    Accesstokens;

Accesstoken = Basetoken.extend({
    tableName: 'accesstokens'
});

Accesstokens = ghostBookshelf.Collection.extend({
    model: Accesstoken
});

module.exports = {
    Accesstoken: ghostBookshelf.model('Accesstoken', Accesstoken),
    Accesstokens: ghostBookshelf.collection('Accesstokens', Accesstokens)
};
