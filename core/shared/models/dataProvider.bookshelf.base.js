(function () {
    "use strict";

    /**
     * The base class for interacting with bookshelf models/collections.
     * Provides naive implementations of CRUD/BREAD operations.
     */
    var BookshelfBase = function (model, collection) {
        this.model = model;
        this.collection = collection;
    };

    /**
     * Naive find all
     * @param args
     * @param callback
     */
    BookshelfBase.prototype.findAll = function (args, callback) {
        args = args || {};
        this.collection.forge().fetch().then(function (results) {
            callback(null, results);
        }, callback);
    };

    /**
     * Naive find one where args match
     * @param args
     * @param callback
     */
    BookshelfBase.prototype.findOne = function (args, callback) {
        this.model.forge(args).fetch().then(function (result) {
            callback(null, result);
        }, callback);
    };

    /**
     * Naive add
     * @param newObj
     * @param callback
     */
    BookshelfBase.prototype.add = function (newObj, callback) {
        this.model.forge(newObj).save().then(function (createdObj) {
            callback(null, createdObj);
        }, callback);
    };

    /**
     * Naive edit
     * @param editedObj
     * @param callback
     */
    BookshelfBase.prototype.edit = function (editedObj, callback) {
        this.model.forge({id: editedObj.id}).fetch().then(function (foundObj) {
            foundObj.set(editedObj).save().then(function (updatedObj) {
                callback(null, updatedObj);
            }, callback);
        });
    };

    /**
     * Naive destroy
     * @param _identifier
     * @param callback
     */
    BookshelfBase.prototype.destroy = function (_identifier, callback) {
        this.model.forge({id: _identifier}).destroy().then(function () {
            callback(null);
        });
    };

    module.exports = BookshelfBase;
}());