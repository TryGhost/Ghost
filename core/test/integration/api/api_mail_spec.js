var testUtils       = require('../../utils'),
    configUtils     = require('../../utils/configUtils'),
    should          = require('should'),
    i18n            = require('../../../../core/server/i18n'),

    // test data
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

i18n.init();

describe('Mail API', function () {
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('perms:mail', 'perms:init'));

    afterEach(function () {
        configUtils.restore();
    });

    it('returns a success', function () {
        configUtils.set({mail: {transport: 'stub'}});

        var MailAPI = require('../../../server/api/mail');

        return MailAPI.send(mailData, testUtils.context.internal).then(function (response) {
            should.exist(response.mail);
            should.exist(response.mail[0].message);
            should.exist(response.mail[0].status);

            response.mail[0].message.subject.should.eql('testemail');
        });
    });

    it('returns a boo boo', function () {
        configUtils.set({mail: {transport: 'stub', options: {error: 'Stub made a boo boo :('}}});

        var MailAPI = require('../../../server/api/mail');

        return MailAPI.send(mailData, testUtils.context.internal).then(function () {
            throw new Error('Stub did not error');
        }).catch(function (error) {
            error.message.should.startWith('Error: Stub made a boo boo :(');
            error.errorType.should.eql('EmailError');
        });
    });
});
