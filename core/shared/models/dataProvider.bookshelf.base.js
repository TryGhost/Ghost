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
     * @param callback
     */
    BookshelfBase.prototype.findAll = BookshelfBase.prototype.browse = function (args, callback) {
        if (_.isFunction(args)) {
            // Curry the optional args parameter
            callback = args;
            args = {};
        }

        this.collection.forge(args).fetch().then(function (results) {
            callback(null, results);
        }, callback);
    };

    /**
     * Naive find one where args match
     * @param args
     * @param callback
     */
    BookshelfBase.prototype.findOne = BookshelfBase.prototype.read = function (args, callback) {
        this.model.forge(args).fetch().then(function (result) {
            callback(null, result);
        }, callback);
    };

    /**
     * Naive edit
     * @param editedObj
     * @param callback
     */
    BookshelfBase.prototype.edit = BookshelfBase.prototype.update = function (editedObj, callback) {
        this.model.forge({id: editedObj.id}).fetch().then(function (foundObj) {
            foundObj.set(editedObj).save().then(function (updatedObj) {
                callback(null, updatedObj);
            }, callback);
        });
    };

    /**
     * Naive add
     * @param newObj
     * @param callback
     */
    BookshelfBase.prototype.add = BookshelfBase.prototype.create = function (newObj, callback) {
        this.model.forge(newObj).save().then(function (createdObj) {
            callback(null, createdObj);
        }, callback);
    };

    /**
     * Naive destroy
     * @param _identifier
     * @param callback
     */
    BookshelfBase.prototype.destroy = BookshelfBase.prototype.delete = function (_identifier, callback) {
        this.model.forge({id: _identifier}).destroy().then(function () {
            callback(null);
        });
    };

    module.exports = BookshelfBase;
}());