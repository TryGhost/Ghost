/*globals describe, before, beforeEach, afterEach, it */
var testUtils   = require('../utils'),
    should      = require('should'),

    migration   = require('../../server/data/migration/index'),
    Models      = require('../../server/models');

describe('Database Migration (special functions)', function () {
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    describe('004', function () {
        beforeEach(testUtils.setup('settings'));

        it('should add jQuery to ghost_foot injection setting', function (done) {
            Models.Settings.findOne('ghost_foot').then(function (setting) {
                should.exist(setting);
                should.exist(setting.attributes);
                setting.attributes.value.should.equal('');

                process.env.FORCE_MIGRATION = true; // force a migration
                migration.init().then(function () {
                    Models.Settings.findOne('ghost_foot').then(function (result) {
                        var jquery = [
                            '<!-- You can safely delete this line if your theme does not require jQuery -->\n',
                            '<script type="text/javascript" src="https://code.jquery.com/jquery-1.11.3.min.js"></script>\n\n'
                        ];

                        should.exist(result);
                        should.exist(result.attributes);
                        result.attributes.value.should.equal(jquery.join(''));

                        done();
                    });
                });
            });
        });
    });
});
