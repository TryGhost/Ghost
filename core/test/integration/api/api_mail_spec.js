/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils       = require('../../utils'),
    should          = require('should'),
    config          = require('../../../server/config'),
    mailer          = require('../../../server/mail'),

    // Stuff we are testing
    MailAPI         = require('../../../server/api/mail'),
    mailDataNoDomain = {
        mail: [{
            message: {
                to: 'joe@doesntexistexample091283zalgo.com',
                subject: 'testemail',
                html: '<p>This</p>'
            },
            options: {}
        }]
    },
    mailDataNoServer = {
        mail: [{
            message: {
                to: 'joe@example.com',
                subject: 'testemail',
                html: '<p>This</p>'
            },
            options: {}
        }]
    },
    mailDataIncomplete = {
        mail: [{
            message: {
                subject: 'testemail',
                html: '<p>This</p>'
            },
            options: {}
        }]
    };

describe('Mail API Nothing configured', function () {
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('perms:mail', 'perms:init'));

    should.exist(MailAPI);

    it('return no email configured', function (done) {
        MailAPI.send(mailDataNoServer, testUtils.context.internal).then(function (response) {
            /*jshint unused:false */
            done();
        }).catch(function (error) {
            error.message.should.eql('Email Error: No e-mail transport configured.');
            error.type.should.eql('EmailError');
            done();
        }).catch(done);
    });

    it('return no email configured even when sending incomplete data', function (done) {
        MailAPI.send(mailDataIncomplete, testUtils.context.internal).then(function (response) {
            /*jshint unused:false */
            done();
        }).catch(function (error) {
            error.message.should.eql('Email Error: No e-mail transport configured.');
            error.type.should.eql('EmailError');
            done();
        }).catch(done);
    });
});

describe('Mail API Direct', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('perms:mail', 'perms:init'));

    should.exist(MailAPI);

    it('return correct failure message for domain doesnt exist', function (done) {
        config.load().then(config.set({mail: {}})).then(mailer.init()).then(function () {
            mailer.transport.transportType.should.eql('DIRECT');
            return MailAPI.send(mailDataNoDomain, testUtils.context.internal);
        }).then(function (response) {
            /*jshint unused:false */
            done();
        }).catch(function (error) {
            error.message.should.startWith('Email Error: Failed sending email');
            error.type.should.eql('EmailError');
            done();
        }).catch(done);
    });

    it('return correct failure message for no mail server at this address', function (done) {
        mailer.transport.transportType.should.eql('DIRECT');

        MailAPI.send(mailDataNoServer, testUtils.context.internal).then(function (response) {
            /*jshint unused:false */
            done();
        }).catch(function (error) {
            error.message.should.eql('Email Error: Failed sending email.');
            error.type.should.eql('EmailError');
            done();
        }).catch(done);
    });

    it('return correct failure message for incomplete data', function (done) {
        mailer.transport.transportType.should.eql('DIRECT');

        MailAPI.send(mailDataIncomplete, testUtils.context.internal).then(function (response) {
            /*jshint unused:false */
            done();
        }).catch(function (error) {
            error.message.should.eql('Email Error: Incomplete message data.');
            error.type.should.eql('EmailError');
            done();
        }).catch(done);
    });
});



describe('Mail API Stub', function () {
    // Keep the DB clean

    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('perms:mail', 'perms:init'));

    should.exist(MailAPI);

    it('stub returns a success', function (done) {
        config.load().then(config.set({mail: {transport: 'stub'}})).then(mailer.init()).then(function () {
            mailer.transport.transportType.should.eql('STUB');
            return MailAPI.send(mailDataNoServer, testUtils.context.internal);
        }).then(function (response) {
            should.exist(response.mail);
            should.exist(response.mail[0].message);
            should.exist(response.mail[0].status);
            response.mail[0].status.should.eql({message: 'Message Queued'});
            response.mail[0].message.subject.should.eql('testemail');
            /*jshint unused:false */
            done();
        }).catch(function (error) {
            should.not.exist(error);
            done();
        }).catch(done);
    });

    it('stub returns a boo boo', function (done) {
        config.load().then(config.set({mail: {transport: 'stub', error: 'Stub made a boo boo :('}})).then(mailer.init()).then(function () {
            mailer.transport.transportType.should.eql('STUB');
            return MailAPI.send(mailDataNoServer, testUtils.context.internal);
        }).then(function (response) {

            /*jshint unused:false */
            done();
        }).catch(function (error) {
            error.message.should.startWith('Email Error: Failed sending email: there is no mail server at this address');
            error.type.should.eql('EmailError');
            done();
        }).catch(done);
    });
});
