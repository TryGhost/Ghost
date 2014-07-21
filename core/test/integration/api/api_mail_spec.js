/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils       = require('../../utils'),
    should          = require('should'),

    // Stuff we are testing
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
    beforeEach(testUtils.setup('perms:mail', 'perms:init'));

    should.exist(MailAPI);

    it('return correct failure message (internal)', function (done) {
        MailAPI.send(mailData, testUtils.context.internal).then(function (response) {
            /*jshint unused:false */
            done();
        }).catch(function (error) {
            error.type.should.eql('EmailError');
            done();
        }).catch(done);
    });
});