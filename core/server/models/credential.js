const ghostBookshelf = require('./base');
const security = require('../lib/security');

const Credential = ghostBookshelf.Model.extend({
    tableName: 'credentials',

    relationships: ['passwordFor', 'tokenFor'],
    relationshipBelongsTo: {
        passwordFor: 'members',
        tokenFor: 'members'
    },

    passwordFor() {
        return this.belongsToMany('Member', 'members_passwords', 'credential_id', 'member_id').first();
    },

    tokenFor() {
        return this.belongsToMany('Member', 'members_tokens', 'credential_id', 'member_id').first();
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'credential' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, attrs, options) {
        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, attrs, options) {
        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        model.emitChange('deleted', options);
    },

    onCreating() {
        ghostBookshelf.Model.prototype.onCreating.apply(this, arguments);
        if (this.has('secret')) {
            return security.password.hash(String(this.get('secret')))
                .then((hash) => {
                    this.set('secret', hash);
                });
        }
    },

    onSaving() {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (this.hasChanged('secret')) {
            return security.password.hash(String(this.get('secret')))
                .then((hash) => {
                    this.set('secret', hash);
                });
        }
    }
}, {

});

const Credentials = ghostBookshelf.Collection.extend({
    model: Credential
});

module.exports = {
    Member: ghostBookshelf.model('Credential', Credential),
    Members: ghostBookshelf.collection('Credentials', Credentials)
};
