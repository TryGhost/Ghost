const ghostBookshelf = require('./base');
const uuid = require('uuid');

const Member = ghostBookshelf.Model.extend({
    tableName: 'members',

    defaults() {
        return {
            subscribed: true,
            uuid: uuid.v4()
        };
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'member' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, attrs, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, attrs, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
    }
});

const Members = ghostBookshelf.Collection.extend({
    model: Member
});

module.exports = {
    Member: ghostBookshelf.model('Member', Member),
    Members: ghostBookshelf.collection('Members', Members)
};
