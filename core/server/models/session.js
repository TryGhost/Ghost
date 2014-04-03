var ghostBookshelf = require('./base'),

    Session,
    Sessions;

Session = ghostBookshelf.Model.extend({

    tableName: 'sessions',

    // override for base function since we don't have
    // a created_by field for sessions
    creating: function (newObj, attr, options) {
        /*jshint unused:false*/
    },

    // override for base function since we don't have
    // a updated_by field for sessions
    saving: function (newObj, attr, options) {
        /*jshint unused:false*/
        // Remove any properties which don't belong on the model
        this.attributes = this.pick(this.permittedAttributes());
    },

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
