/*globals describe, it*/
var should          = require('should'),
    express         = require('express'),
    _               = require('lodash'),
    rewire          = require('rewire'),

    // Stuff we are testing
    GhostServer     = rewire('../../server/ghost-server');

describe('GhostServer', function () {
    describe('instantiating', function () {
        describe('configured as a stand-alone app', function () {
            it('schedules a warning message to appear if the server doesn\'t start', function () {
                var ghost,
                    config = GhostServer.__get__('config');
                _.merge(config, config._config);

                ghost = new GhostServer(express());
                should(ghost.upgradeWarning).not.equal(undefined);
            });
        });

        describe('configured to run as Express middleware', function () {
            it('doesn\'t schedule a warning message', function () {
                var ghost,
                    config = GhostServer.__get__('config');
                config.asMiddleware = true;
                delete config.server;
                delete config.url;

                ghost = new GhostServer(express());
                should(ghost.upgradeWarning).equal(undefined);
            });
        });
    });
});
