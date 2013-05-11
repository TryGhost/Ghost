/**
 * Dummy dataProvider returns hardcoded JSON data until we finish migrating settings data to a datastore
 */

/*globals module, require */
(function () {
    "use strict";

    var _ = require('underscore'),

        DataProvider,
        blogData,
        instance,
        d;

    blogData = {
        url: 'http://localhost:3333', //'http://john.onolan.org',
        title: "John O'Nolan",
        description: "Interactive designer, public speaker, startup advisor and writer. Living in Austria, attempting world domination via keyboard."
    };

    DataProvider = function () {
        if (!instance) {
            instance = this;
        }

        return instance;
    };
    DataProvider.prototype.globals = {};
    DataProvider.prototype.globals.data = [];


    DataProvider.prototype.globals.findAll = function (callback) {
        callback(null, this.data);
    };

    DataProvider.prototype.globals.save = function (globals, callback) {
        var self = this;

        _.each(globals, function (global, key) {
            self.data[key] = global;
        });

        callback(null, globals);
    };

    /* Lets bootstrap with dummy data */
    d = new DataProvider();
    d.globals.save(blogData, function (error, globals) {});

    module.exports = DataProvider;
}());