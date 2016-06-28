var sinon = require('sinon'),
    mail = require(__dirname + '../../../../server/mail'),
    sandbox = sinon.sandbox.create();

describe('Mail: Utils', function () {
    var scope = {ghostMailer: null};

    before(function () {
        scope.ghostMailer = new mail.GhostMailer();

        sandbox.stub(scope.ghostMailer.transport, 'sendMail', function (message, sendMailDone) {
            sendMailDone(null, {
                statusHandler: {
                    once: function (eventName, eventDone) {
                        if (eventName === 'sent') {
                            eventDone();
                        }
                    }
                }
            });
        });
    });

    after(function () {
        sandbox.restore();
    });

    it('generate welcome', function (done) {
        mail.utils.generateContent({
            template: 'welcome',
            data: {
                ownerEmail: 'kate@ghost.org'
            }
        }).then(function (result) {
            return scope.ghostMailer.send({
                to: 'kate@ghost.org',
                subject: 'lol',
                html: result.html,
                text: result.text
            });
        }).then(function () {
            done();
        }).catch(done);
    });
});
