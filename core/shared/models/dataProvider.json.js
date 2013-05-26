/**
 * Dummy dataProvider returns hardcoded JSON data until we finish migrating settings data to a datastore
 */

/*globals module, require */
(function () {
    "use strict";

    var _ = require('underscore'),
        when = require('when'),
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


    DataProvider.prototype.globals.findAll = function() {
        return when(this.data);
    };

    DataProvider.prototype.globals.save = function (globals) {
        _.each(globals, function (global, key) {
            this.data[key] = global;
        }, this);

        return when(globals);
    };

    /* Lets bootstrap with dummy data */
    d = new DataProvider();
    d.globals.save(blogData, function (error) {
        if (error) { throw error; }
    });

    module.exports = DataProvider;
}());