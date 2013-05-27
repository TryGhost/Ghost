/*global require, module */
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
     * @param opts (optional)
     */
    BookshelfBase.prototype.findAll = BookshelfBase.prototype.browse = function (opts) {
        return this.collection.forge().fetch(opts);
    };

    /**
     * Naive find one where args match
     * @param args
     * @param opts (optional)
     */
    BookshelfBase.prototype.findOne = BookshelfBase.prototype.read = function (args, opts) {
        opts = opts || {};
        return this.model.forge(args).fetch(opts);
    };

    /**
     * Naive edit
     * @param editedObj
     * @param opts (optional)
     */
    BookshelfBase.prototype.edit = BookshelfBase.prototype.update = function (editedObj, opts) {
        opts = opts || {};
        return this.model.forge({id: editedObj.id}).fetch(opts).then(function (foundObj) {
            return foundObj.set(editedObj).save();
        });
    };

    /**
     * Naive add
     * @param newObj
     * @param opts (optional)
     */
    BookshelfBase.prototype.add = BookshelfBase.prototype.create = function (newObj, opts) {
        opts = opts || {};
        return this.model.forge(newObj).save(opts);
    };

    /**
     * Naive destroy
     * @param _identifier
     * @param opts (optional)
     */
    BookshelfBase.prototype.destroy = BookshelfBase.prototype['delete'] = function (_identifier, opts) {
        opts = opts || {};
        return this.model.forge({id: _identifier}).destroy(opts);
    };

    module.exports = BookshelfBase;
}());