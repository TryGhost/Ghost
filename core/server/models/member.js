const ghostBookshelf = require('./base');

const Member = ghostBookshelf.Model.extend({
    tableName: 'members',

    relationships: ['stripe_info'],
    relationshipBelongsTo: {
        stripe_info: 'members_stripe_info'
    },

    permittedAttributes(...args) {
        return ghostBookshelf.Model.prototype.permittedAttributes.apply(this, args).concat(this.relationships);
    },

    stripe_info() {
        return this.hasMany('MemberStripeInfo', 'member_id');
    }
}, {
    permittedOptions(...args) {
        return ghostBookshelf.Model.permittedOptions.apply(this, args).concat(['withRelated']);
    }
});

const Members = ghostBookshelf.Collection.extend({
    model: Member
});

module.exports = {
    Member: ghostBookshelf.model('Member', Member),
    Members: ghostBookshelf.collection('Members', Members)
};
