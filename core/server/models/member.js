const ghostBookshelf = require('./base');

const Member = ghostBookshelf.Model.extend({
    tableName: 'members',

    relationships: ['password'],

    relationshipBelongsTo: {
        password: 'member_passwords'
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'member' + '.' + event;
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

    toJSON: function toJSON(unfilteredOptions) {
        var options = Member.filterOptions(unfilteredOptions, 'toJSON'),
            attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        // remove password hash and tokens for security reasons
        delete attrs.password;
        delete attrs.tokens;

        return attrs;
    },

    add(data, options) {
        const addMember = () => {
            return ghostBookshelf.Model.add.call(this, data, options)
                .then(({id}) => {
                    return this.findOne({id}, options);
                });
        };

        if (!options.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                options.transacting = transacting;

                return addMember();
            });
        }

        return addMember();
    },

    edit(data, options) {
        const editMember = () => {
            return ghostBookshelf.Model.edit.call(this, data, options)
                .then(({id}) => {
                    return this.findOne({id}, options);
                });
        };

        if (!options.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                options.transacting = transacting;

                return editMember();
            });
        }

        return editMember();
    },

    password: function password() {
        return this.hasOne('MemberPassword', 'member_id');
    },

    permittedAttributes(...args) {
        return ghostBookshelf.Model.prototype.permittedAttributes.apply(this, args).concat(this.relationships);
    }
});

const Members = ghostBookshelf.Collection.extend({
    model: Member
});

module.exports = {
    Member: ghostBookshelf.model('Member', Member),
    Members: ghostBookshelf.collection('Members', Members)
};
