const ghostBookshelf = require('./base');

const Member = ghostBookshelf.Model.extend({
    tableName: 'members',

    relationships: ['stripe_customers'],
    relationshipBelongsTo: {
        stripe_customers: 'members_stripe_customers'
    },

    permittedAttributes(...args) {
        return ghostBookshelf.Model.prototype.permittedAttributes.apply(this, args).concat(this.relationships);
    },

    stripe_customers() {
        return this.hasMany('MemberStripeCustomer', 'member_id');
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
