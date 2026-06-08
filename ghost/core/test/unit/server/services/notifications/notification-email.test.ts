import assert from 'node:assert/strict';
import sinon from 'sinon';
import {NotificationEmailService} from '../../../../../core/server/services/notifications/notification-email';

function fakeMailer() {
    return {send: sinon.stub().resolves()};
}

describe('NotificationEmailService', function () {
    it('sends one email per recipient, shell-rendered with that recipient interpolated', async function () {
        const mailer = fakeMailer();
        const generateEmailContent = sinon.stub().callsFake(async (opts: {data: Record<string, unknown>}) => ({
            html: `<html>shell:${opts.data.recipientEmail}:${opts.data.message}</html>`,
            text: 'plain'
        }));
        const service = new NotificationEmailService({
            mailer,
            generateEmailContent,
            getSiteUrl: () => 'https://example.com'
        });

        await service.send({
            to: ['owner@example.com', 'admin@example.com'],
            subject: 'Security update',
            content: '<p>Update now</p>'
        });

        sinon.assert.calledTwice(mailer.send);
        assert.equal(mailer.send.args[0][0].to, 'owner@example.com');
        assert.equal(mailer.send.args[1][0].to, 'admin@example.com');
        assert.equal(mailer.send.args[0][0].subject, 'Security update');
        assert.match(mailer.send.args[0][0].html, /shell:owner@example.com:/);
        assert.match(mailer.send.args[1][0].html, /shell:admin@example.com:/);
    });

    it('sanitises the content before passing it to the shell', async function () {
        const mailer = fakeMailer();
        const generateEmailContent = sinon.stub().resolves({html: '<html></html>'});
        const service = new NotificationEmailService({
            mailer,
            generateEmailContent,
            getSiteUrl: () => 'https://example.com'
        });

        await service.send({
            to: ['owner@example.com'],
            subject: 'x',
            content: '<p>hi</p><script>alert(1)</script>'
        });

        const renderedMessage = generateEmailContent.args[0][0].data.message;
        assert.equal(renderedMessage.includes('<script>'), false);
        assert.ok(renderedMessage.includes('<p>hi</p>'));
    });

    it('does nothing when there are no recipients', async function () {
        const mailer = fakeMailer();
        const generateEmailContent = sinon.stub();
        const service = new NotificationEmailService({
            mailer,
            generateEmailContent,
            getSiteUrl: () => 'https://example.com'
        });

        await service.send({to: [], subject: 'x', content: '<p>hi</p>'});

        sinon.assert.notCalled(generateEmailContent);
        sinon.assert.notCalled(mailer.send);
    });
});
