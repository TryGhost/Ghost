const ghostBookshelf = require('./base');
const security = require('../lib/security');

const Member = ghostBookshelf.Model.extend({
    tableName: 'members',

    onSaving() {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (this.hasChanged('password')) {
            return security.password.hash(String(this.get('password')))
                .then((hash) => {
                    this.set('password', hash);
                });
        }
    },

    comparePassword(rawPassword) {
        return security.password.compare(rawPassword, this.get('password'));
    },

    toJSON(unfilteredOptions) {
        var options = Member.filterOptions(unfilteredOptions, 'toJSON'),
            attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        // remove password hash and tokens for security reasons
        delete attrs.password;

        return attrs;
    }
});

const Members = ghostBookshelf.Collection.extend({
    model: Member
});

module.exports = {
    Member: ghostBookshelf.model('Member', Member),
    Members: ghostBookshelf.collection('Members', Members)
};
