const ghostBookshelf = require('./base'),
    Basetoken = require('./base/token');

let Accesstoken,
    Accesstokens;

Accesstoken = Basetoken.extend({
    tableName: 'accesstokens',

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'token' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, attrs, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);
        model.emitChange('added', options);
    }
});

Accesstokens = ghostBookshelf.Collection.extend({
    model: Accesstoken
});

module.exports = {
    Accesstoken: ghostBookshelf.model('Accesstoken', Accesstoken),
    Accesstokens: ghostBookshelf.collection('Accesstokens', Accesstokens)
};
