const ghostBookshelf = require('./base');
const security = require('../lib/security');

const MemberPassword = ghostBookshelf.Model.extend({
    tableName: 'member_passwords',

    member() {
        return this.belongsTo('Member');
    },

    onSaving() {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (this.hasChanged('secret')) {
            return security.password.hash(String(this.get('secret')))
                .then((hash) => {
                    this.set('secret', hash);
                });
        }
    },

    compare(rawPassword) {
        return security.password.compare(this.get('secret'), rawPassword);
    }
});

const MemberPasswords = ghostBookshelf.Collection.extend({
    model: MemberPassword
});

module.exports = {
    MemberPassword: ghostBookshelf.model('MemberPassword', MemberPassword),
    MemberPasswords: ghostBookshelf.collection('MemberPasswords', MemberPasswords)
};
