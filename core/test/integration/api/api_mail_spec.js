/*globals describe, before, beforeEach, afterEach, it */
var testUtils       = require('../../utils'),
    should          = require('should'),

    // Stuff we are testing
    permissions     = require('../../../server/permissions'),
    MailAPI         = require('../../../server/api/mail');


describe('Mail API', function () {
    var mailData = {
            mail: [{
                message: {
                    to: 'joe@example.com',
                    subject: 'testemail',
                    html: '<p>This</p>'
                },
                options: {}
            }]
        };

    before(function (done) {
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


    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });


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