const ghostBookshelf = require('./base');

const VerifiedEmail = ghostBookshelf.Model.extend({
    tableName: 'verified_emails'
}, {
    orderDefaultRaw: function orderDefaultRaw() {
        return 'created_at DESC';
    }
});

module.exports = {
    VerifiedEmail: ghostBookshelf.model('VerifiedEmail', VerifiedEmail)
};
