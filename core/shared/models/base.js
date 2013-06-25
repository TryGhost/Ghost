var GhostBookshelf,
    Bookshelf = require('bookshelf'),
    config = require('../../../config');

// Initializes Bookshelf as its own instance, so we can modify the Models and not mess up
// others' if they're using the library outside of ghost.
GhostBookshelf = Bookshelf.Initialize('ghost', config.database[process.env.NODE_ENV || 'development']);

// The Base Model which other Ghost objects will inherit from,
// including some convenience functions as static properties on the model.
GhostBookshelf.Model = GhostBookshelf.Model.extend({

    // Base prototype properties will go here

}, {

    /**
     * Naive find all
     * @param options (optional)
     */
    findAll:  function (options) {
        options = options || {};
        return GhostBookshelf.Collection.forge([], {model: this}).fetch(options);
    },

    browse: function () {
        return this.findAll.apply(this, arguments);
    },

    /**
     * Naive find one where args match
     * @param args
     * @param options (optional)
     */
    findOne: function (args, options) {
        options = options || {};
        return this.forge(args).fetch(options);
    },

    read: function () {
        return this.findOne.apply(this, arguments);
    },

    /**
     * Naive edit
     * @param editedObj
     * @param options (optional)
     */
    edit: function (editedObj, options) {
        options = options || {};
        return this.forge({id: editedObj.id}).fetch(options).then(function (foundObj) {
            return foundObj.set(editedObj).save();
        });
    },

    update: function () {
        return this.edit.apply(this, arguments);
    },

    /**
     * Naive create
     * @param editedObj
     * @param options (optional)
     */
    add: function (newObj, options) {
        options = options || {};
        return this.forge(newObj).save(options);
    },

    create: function () {
        return this.add.apply(this, arguments);
    },

    /**
     * Naive destroy
     * @param _identifier
     * @param options (optional)
     */
    destroy: function (_identifier, options) {
        options = options || {};
        return this.forge({id: _identifier}).destroy(options);
    },

    'delete': function () {
        return this.destroy.apply(this, arguments);
    }

});

module.exports = GhostBookshelf;