(function () {
    "use strict";

    var _ = require('underscore'),
        BookshelfBase;

    /**
     * The base class for interacting with bookshelf models/collections.
     * Provides naive implementations of CRUD/BREAD operations.
     */
    BookshelfBase = function (model, collection) {
        // Bind the 'this' value for all our functions since they get messed
        // up by the when.call
        _.bindAll(this, 'findAll', 'browse', 'findOne', 'read', 'edit', 'add', 'destroy');

        this.model = model;
        this.collection = collection;
    };

    /**
     * Naive find all
     * @param args (optional)
     */
    BookshelfBase.prototype.findAll = BookshelfBase.prototype.browse = function (args) {
        args || (args = {});
        return this.collection.forge(args).fetch();
    };

    /**
     * Naive find one where args match
     * @param args
     */
    BookshelfBase.prototype.findOne = BookshelfBase.prototype.read = function (args) {
        return this.model.forge(args).fetch();
    };

    /**
     * Naive edit
     * @param editedObj
     */
    BookshelfBase.prototype.edit = BookshelfBase.prototype.update = function (editedObj) {
        return this.model.forge({id: editedObj.id}).fetch().then(function (foundObj) {
            return foundObj.set(editedObj).save();
        });
    };

    /**
     * Naive add
     * @param newObj
     */
    BookshelfBase.prototype.add = BookshelfBase.prototype.create = function (newObj) {
        return this.model.forge(newObj).save();
    };

    /**
     * Naive destroy
     * @param _identifier
     */
    BookshelfBase.prototype.destroy = BookshelfBase.prototype['delete'] = function (_identifier) {
        return this.model.forge({id: _identifier}).destroy();
    };

    module.exports = BookshelfBase;
}());