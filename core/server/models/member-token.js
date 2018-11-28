const ghostBookshelf = require('./base');
const security = require('../lib/security');

const MemberToken = ghostBookshelf.Model.extend({
    tableName: 'member_tokens',

    member() {
        return this.belongsTo('Member');
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
});

const MemberTokens = ghostBookshelf.Collection.extend({
    model: MemberToken
});

module.exports = {
    MemberToken: ghostBookshelf.model('MemberToken', MemberToken),
    MemberTokens: ghostBookshelf.collection('MemberTokens', MemberTokens)
};
