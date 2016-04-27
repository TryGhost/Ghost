/*globals describe, before, beforeEach, afterEach, it */
var testUtils       = require('../../utils'),
    should          = require('should'),
    i18n            = require('../../../../core/server/i18n');

i18n.init();

describe('Slack API', function () {
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('perms:mail', 'perms:init'));

    it('returns a success', function (done) {
        var SlackAPI = require('../../../server/api/slack');

        SlackAPI.sendTest().then(function (response) {
            console.log(response);
            should.exist(response);

            done();
        }).catch(done);
    });

    it('returns a boo boo', function (done) {
        var SlackAPI = require('../../../server/api/slack');

        SlackAPI.sendTest().then(function () {
            done(new Error('Stub did not error'));
        }).catch(function (error) {
            error.message.should.startWith('Error: Stub made a boo boo :(');
            error.errorType.should.eql('EmailError');
            done();
        }).catch(done);
    });
});
