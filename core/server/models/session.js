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
    upsert: function (id, data) {
        return this.forge({id})
            .fetch({require: true})
            .then((model) => {
                return model.set('session_data', data).save();
            }, () => {
                return this.forge({
                    id: id
                }).save({
                    user_id: data.user_id,
                    session_data: data
                }, {method: 'insert'});
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
