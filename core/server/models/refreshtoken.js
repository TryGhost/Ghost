var ghostBookshelf = require('./base'),
    User           = require('./user'),
    Client         = require('./client'),

    Refreshtoken,
    Refreshtokens;

Refreshtoken = ghostBookshelf.Model.extend({

    tableName: 'refreshtokens',

    user: function () {
        return this.belongsTo(User);
    },

    client: function () {
        return this.belongsTo(Client);
    },

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
    }

}, {
    destroyAllExpired:  function (options) {
        options = this.filterOptions(options, 'destroyAll');
        return ghostBookshelf.Collection.forge([], {model: this})
            .query('where', 'expires', '<', Date.now())
            .fetch()
            .then(function (collection) {
                collection.invokeThen('destroy', options);
            });
    }
});

Refreshtokens = ghostBookshelf.Collection.extend({
    model: Refreshtoken
});

module.exports = {
    Refreshtoken: Refreshtoken,
    Refreshtokens: Refreshtokens
};