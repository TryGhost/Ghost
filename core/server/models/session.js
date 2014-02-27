var ghostBookshelf = require('./base'),

    Session,
    Sessions;

Session = ghostBookshelf.Model.extend({

    tableName: 'sessions'

}, {
    destroyAll:  function (options) {
        options = options || {};
        return ghostBookshelf.Collection.forge([], {model: this}).fetch()
            .then(function (collection) {
                collection.invokeThen('destroy', options);
            });
    }
});

Sessions = ghostBookshelf.Collection.extend({
    model: Session
});

module.exports = {
    Session: Session,
    Sessions: Sessions
};
