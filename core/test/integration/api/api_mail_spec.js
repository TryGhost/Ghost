/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils       = require('../../utils'),
    should          = require('should'),

    // Stuff we are testing
    permissions     = require('../../../server/permissions'),
    MailAPI         = require('../../../server/api/mail'),
    mailData = {
        mail: [{
            message: {
                to: 'joe@example.com',
                subject: 'testemail',
                html: '<p>This</p>'
            },
            options: {}
        }]
    };

describe('Mail API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    beforeEach(function (done) {
        testUtils.clearData()
            .then(function () {
                return testUtils.initData();
            }).then(function () {
                return testUtils.insertDefaultFixtures();
            }).then(function () {
                return permissions.init();
            }).then(function () {
                done();
            }).catch(done);
    });

    should.exist(MailAPI);

    it('return correct failure message', function (done) {
        MailAPI.send(mailData, {context: {internal: true}}).then(function (response) {
            /*jshint unused:false */
            done();
        }).catch(function (error) {
            error.type.should.eql('EmailError');
            done();
        }).catch(done);
    });
});