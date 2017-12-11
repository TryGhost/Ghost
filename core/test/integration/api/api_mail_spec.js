var should = require('should'),
    testUtils = require('../../utils'),
    _ = require('lodash'),
    configUtils = require('../../utils/configUtils'),
    common = require('../../../server/lib/common'),
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

common.i18n.init();

describe('Mail API', function () {
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('perms:mail', 'perms:init'));

    beforeEach(function () {
        _.each(require.cache, function (value, key) {
            if (key.match(/server\/api\/mail/)) {
                delete require.cache[key];
            }
        });

        require('../../../server/api/mail');
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('returns a success', function (done) {
        configUtils.set({mail: {transport: 'stub'}});

        var MailAPI = require('../../../server/api/mail');

        MailAPI.send(mailData, testUtils.context.internal).then(function (response) {
            should.exist(response.mail);
            should.exist(response.mail[0].message);
            should.exist(response.mail[0].status);

            response.mail[0].message.subject.should.eql('testemail');
            done();
        }).catch(done);
    });

    it('returns a boo boo', function (done) {
        configUtils.set({mail: {transport: 'stub', options: {error: 'Stub made a boo boo :('}}});

        var MailAPI = require('../../../server/api/mail');

        MailAPI.send(mailData, testUtils.context.internal).then(function () {
            done(new Error('Stub did not error'));
        }).catch(function (error) {
            error.stack.should.match(/Error: Stub made a boo boo/);
            error.errorType.should.eql('EmailError');
            done();
        }).catch(done);
    });
});
