const ghostBookshelf = require('./base');

let Session,
    Sessions;

Session = ghostBookshelf.Model.extend({
    tableName: 'sessions',

    parse: function parse(attrs) {
        if (!attrs.session_data) {
            return attrs;
        }
        return Object.assign(attrs, {
            session_data: JSON.parse(attrs.session_data)
        });
    },

    format: function format(attrs) {
        if (!attrs.session_data) {
            return attrs;
        }
        return Object.assign(attrs, {
            session_data: JSON.stringify(attrs.session_data)
        });
    },

    user: function () {
        return this.belongsTo('User');
    }
});

Sessions = ghostBookshelf.Collection.extend({
    model: Session
});

module.exports = {
    Session: ghostBookshelf.model('Session', Session),
    Sessions: ghostBookshelf.collection('Sessions', Sessions)
};
