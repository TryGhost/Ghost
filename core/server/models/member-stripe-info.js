const ghostBookshelf = require('./base');

const MemberStripeInfo = ghostBookshelf.Model.extend({
    tableName: 'members_stripe_info'
});

module.exports = {
    MemberStripeInfo: ghostBookshelf.model('MemberStripeInfo', MemberStripeInfo)
};
