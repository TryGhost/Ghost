const ghostBookshelf = require('./base');

const Session = ghostBookshelf.Model.extend({
    tableName: 'sessions',

    parse: function parse(attrs) {
        attrs.session_data = JSON.parse(attrs.session_data);
        return attrs;
    },

    format: function format(attrs) {
        if (attrs.session_data) {
            attrs.session_data = JSON.stringify(attrs.session_data);
        }
        return attrs;
    },

    user: function () {
        return this.belongsTo('User');
    }
}, {
    setSession: function (id, data) {
        const userId = data.user_id;
        return this.findOne({session_id: id, user_id: userId})
            .then((model) => {
                if (model) {
                    return this.edit({
                        session_data: data
                    }, {
                        id: model.id
                    });
                }
                return this.add({
                    session_id: id,
                    session_data: data,
                    user_id: userId
                });
            });
    }
});

const Sessions = ghostBookshelf.Collection.extend({
    model: Session
});

module.exports = {
    Session: ghostBookshelf.model('Session', Session),
    Sessions: ghostBookshelf.collection('Sessions', Sessions)
};
