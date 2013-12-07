// # Ghost Module
// Defines core methods required to build the application

// Module dependencies
var config        = require('./server/config'),
    when          = require('when'),
    express       = require('express'),
    errors        = require('./server/errorHandling'),
    _             = require('underscore'),
    url           = require('url'),
    models        = require('./server/models'),
    permissions   = require('./server/permissions'),
    uuid          = require('node-uuid'),
    api           = require('./server/api'),

// Variables
    Ghost,
    instance;

// ## Module Methods
/**
 * @method Ghost
 * @returns {*}
 * @constructor
 */
Ghost = function () {

    if (!instance) {
        instance = this;

        instance.globals = {};

        // Holds the dbhash (mainly used for cookie secret)
        instance.dbHash = undefined;

        _.extend(instance, {
            // there's no management here to be sure this has loaded
            dataProvider: models,
            blogGlobals:  function () {
                /* this is a bit of a hack until we have a better way to combine settings and config
                 * this data is what becomes globally available to themes */
                return instance.globals;
            },
            getGlobals: function () {
                return when.all([
                    api.settings.read('title'),
                    api.settings.read('description'),
                    api.settings.read('logo'),
                    api.settings.read('cover')
                ]).then(function (globals) {

                    instance.globals.path = config.paths().path;

                    instance.globals.url = config().url;
                    instance.globals.title = globals[0].value;
                    instance.globals.description = globals[1].value;
                    instance.globals.logo = globals[2] ? globals[2].value : '';
                    instance.globals.cover = globals[3] ? globals[3].value : '';
                    return;
                });
            }
        });
    }
    return instance;
};

// Initialise the application
Ghost.prototype.init = function () {
    var self = this;

    function doFirstRun() {
        var firstRunMessage = [
            'Welcome to Ghost.',
            'You\'re running under the <strong>',
            process.env.NODE_ENV,
            '</strong>environment.',

            'Your URL is set to',
            '<strong>' + config().url + '</strong>.',
            'See <a href="http://docs.ghost.org/">http://docs.ghost.org</a> for instructions.'
        ];

        return api.notifications.add({
            type: 'info',
            message: firstRunMessage.join(' '),
            status: 'persistent',
            id: 'ghost-first-run'
        });
    }

    function initDbHashAndFirstRun() {
        return when(models.Settings.read('dbHash')).then(function (dbhash) {
            // we already ran this, chill
            self.dbHash = dbhash.attributes.value;
            return dbhash.attributes.value;
        }).otherwise(function (error) {
            /*jslint unparam:true*/
            // this is where all the "first run" functionality should go
            var dbhash = uuid.v4();
            return when(models.Settings.add({key: 'dbHash', value: dbhash, type: 'core'})).then(function () {
                self.dbHash = dbhash;
                return dbhash;
            }).then(doFirstRun);
        });
    }

    // ### Initialisation
    return when.join(
        // Initialise the models
        self.dataProvider.init(),
        // Calculate paths
        config.paths.updatePaths(config().url)
    ).then(function () {
        // Populate any missing default settings
        return models.Settings.populateDefaults();
    }).then(function () {
        // Initialize the settings cache
        return api.init();
    }).then(function () {

        return self.getGlobals();
    }).then(function () {
        return when.join(
            // Check for or initialise a dbHash.
            initDbHashAndFirstRun(),
            // Initialize the permissions actions and objects
            permissions.init()
        );
    }).otherwise(errors.logAndThrowError);
};

module.exports = Ghost;
