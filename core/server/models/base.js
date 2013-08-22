var GhostBookshelf,
    Bookshelf = require('bookshelf'),
    _ = require('underscore'),
    config = require('../../../config');

// Initializes Bookshelf as its own instance, so we can modify the Models and not mess up
// others' if they're using the library outside of ghost.
GhostBookshelf = Bookshelf.Initialize('ghost', config.env[process.env.NODE_ENV || 'development'].database);

// The Base Model which other Ghost objects will inherit from,
// including some convenience functions as static properties on the model.
GhostBookshelf.Model = GhostBookshelf.Model.extend({

    // Base prototype properties will go here
    // Fix problems with dates
    fixDates: function (attrs) {
        _.each(attrs, function (value, key) {
            if (key.substr(-3) === '_at' && value !== null) {
                attrs[key] = new Date(attrs[key]);
            }
        });

        return attrs;
    },

    format: function (attrs) {
        return this.fixDates(attrs);
    },

    toJSON: function (options) {
        var attrs = this.fixDates(_.extend({}, this.attributes)),
            relations = this.relations;

        if (options && options.shallow) {
            return attrs;
        }

        _.each(relations, function (relation, key) {
            attrs[key] = relation.toJSON ? relation.toJSON() : relation;
        });

        return attrs;
    }

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
            return foundObj.save(editedObj);
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
