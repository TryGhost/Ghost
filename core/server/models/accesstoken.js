var ghostBookshelf  = require('./base'),
    Basetoken       = require('./base/token'),
    events         = require('../events'),

    Accesstoken,
    Accesstokens;

Accesstoken = Basetoken.extend({
    tableName: 'accesstokens',

    emitChange: function emitChange(event) {
        // Event named 'token' as access and refresh token will be merged in future, see #6626
        events.emit('token' + '.' + event, this);
    },

    initialize: function initialize() {
        ghostBookshelf.Model.prototype.initialize.apply(this, arguments);

        this.on('created', function onCreated(model) {
            model.emitChange('added');
        });
    }
});

Accesstokens = ghostBookshelf.Collection.extend({
    model: Accesstoken
});

module.exports = {
    Accesstoken: ghostBookshelf.model('Accesstoken', Accesstoken),
    Accesstokens: ghostBookshelf.collection('Accesstokens', Accesstokens)
};
