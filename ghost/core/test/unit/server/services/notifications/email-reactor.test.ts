import assert from 'node:assert/strict';
import sinon from 'sinon';

const logging = require('@tryghost/logging');
const {createAlertEmailReactor} = require('../../../../../core/server/services/notifications/email-reactor');

function build(overrides: Record<string, unknown> = {}) {
    const deps = {
        sendEmail: sinon.stub().resolves(),
        generateEmailContent: sinon.stub().resolves({html: '<html>rendered</html>', text: 'text'}),
        getAdminEmails: sinon.stub().resolves(['owner@example.com', 'admin@example.com']),
        getSiteUrl: sinon.stub().returns('https://example.com'),
        ...overrides
    };
    return {deps, maybeSendEmail: createAlertEmailReactor(deps)};
}

describe('alert email reactor', function () {
    beforeEach(function () {
        sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('emails every admin when an alert notification is added', async function () {
        const {deps, maybeSendEmail} = build();

        await maybeSendEmail({id: 'n1', type: 'alert', message: '<p>Update now</p>'});

        sinon.assert.calledTwice(deps.sendEmail);
        assert.equal(deps.sendEmail.args[0][0].to, 'owner@example.com');
        assert.equal(deps.sendEmail.args[0][0].subject, 'Ghost notification from https://example.com');

        const renderArgs = deps.generateEmailContent.args[0][0];
        assert.equal(renderArgs.template, 'notification');
        assert.equal(renderArgs.data.recipientEmail, 'owner@example.com');
    });

    it('does nothing for non-alert notifications', async function () {
        const {deps, maybeSendEmail} = build();

        await maybeSendEmail({id: 'n1', type: 'info', message: '<p>Released</p>'});

        sinon.assert.notCalled(deps.getAdminEmails);
        sinon.assert.notCalled(deps.sendEmail);
    });

    it('logs and sends nothing when recipient resolution fails', async function () {
        const getAdminEmails = sinon.stub().rejects(new Error('lookup boom'));
        const {deps, maybeSendEmail} = build({getAdminEmails});

        await maybeSendEmail({id: 'n1', type: 'alert', message: 'x'});

        sinon.assert.notCalled(deps.sendEmail);
        sinon.assert.called(logging.error);
    });

    it('logs and continues when sending to one recipient fails', async function () {
        const sendEmail = sinon.stub();
        sendEmail.onFirstCall().rejects(new Error('send boom'));
        sendEmail.onSecondCall().resolves();
        const {maybeSendEmail} = build({sendEmail});

        await maybeSendEmail({id: 'n1', type: 'alert', message: 'x'});

        sinon.assert.calledTwice(sendEmail);
        sinon.assert.called(logging.error);
    });
});
