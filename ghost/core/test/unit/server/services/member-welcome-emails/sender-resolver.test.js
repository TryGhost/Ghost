const assert = require('node:assert/strict');
const sinon = require('sinon');
const emailAddressService = require('../../../../../core/server/services/email-address');
const {EmailAddressService} = require('../../../../../core/server/services/email-address/email-address-service');
const settingsCache = require('../../../../../core/shared/settings-cache');
const {resolveSender} = require('../../../../../core/server/services/member-welcome-emails/sender-resolver');

// Default newsletter/site fallback, as the service would stringify it.
const DEFAULTS = {
    from: '"Newsletter Name" <news@example.com>',
    replyTo: 'support@example.com'
};

describe('Member welcome emails: sender-resolver', function () {
    let originalService;

    beforeEach(function () {
        originalService = emailAddressService.service;
        // Self-hoster config: getAddress returns the preferred address as-is.
        emailAddressService.service = new EmailAddressService({
            getManagedEmailEnabled: () => false,
            getSendingDomain: () => null,
            getFallbackDomain: () => null,
            getDefaultEmail: () => ({address: 'default@example.com', name: 'Default'}),
            getFallbackEmail: () => null,
            getMembersSupportAddress: () => 'support@example.com',
            isValidEmailAddress: () => true
        });
        sinon.stub(settingsCache, 'get').withArgs('title').returns('My Site');
    });

    afterEach(function () {
        emailAddressService.service = originalService;
        sinon.restore();
    });

    it('falls through to the newsletter/site default when no action or design sender is set', function () {
        const {sendOptions, ui} = resolveSender({defaultNewsletterSenderOptions: DEFAULTS});

        assert.equal(sendOptions.from, '"Newsletter Name" <news@example.com>');
        assert.equal(sendOptions.replyTo, 'support@example.com');

        // No explicit design-tier values; placeholders reflect the fallback.
        assert.equal(ui.senderNameInput, '');
        assert.equal(ui.senderEmailInput, '');
        assert.equal(ui.replyToEmailInput, '');
        assert.equal(ui.senderNamePlaceholder, 'Newsletter Name');
        assert.equal(ui.senderEmailPlaceholder, 'news@example.com');
        assert.equal(ui.replyToEmailPlaceholder, 'support@example.com');

        // Resolved (input || placeholder) values for read-only display.
        assert.equal(ui.resolvedSenderName, 'Newsletter Name');
        assert.equal(ui.resolvedSenderEmail, 'news@example.com');
        assert.equal(ui.resolvedReplyToEmail, 'support@example.com');
    });

    it('uses the design tier over the newsletter/site default', function () {
        const {sendOptions, ui} = resolveSender({
            designSender: {sender_name: 'Design Sender', sender_email: 'design@example.com', sender_reply_to: null},
            defaultNewsletterSenderOptions: DEFAULTS
        });

        assert.equal(sendOptions.from, '"Design Sender" <design@example.com>');
        // reply-to falls back to the default since the design tier did not set it.
        assert.equal(sendOptions.replyTo, 'support@example.com');

        // The design-tier values surface as the editable inputs.
        assert.equal(ui.senderNameInput, 'Design Sender');
        assert.equal(ui.senderEmailInput, 'design@example.com');
        assert.equal(ui.replyToEmailInput, '');

        // Resolved display values use the design tier, with reply-to from the default.
        assert.equal(ui.resolvedSenderName, 'Design Sender');
        assert.equal(ui.resolvedSenderEmail, 'design@example.com');
        assert.equal(ui.resolvedReplyToEmail, 'support@example.com');
    });

    it('lets the per-action override win over the design tier (nearest-first)', function () {
        const {sendOptions, ui} = resolveSender({
            actionSender: {senderName: 'Action Sender', senderEmail: 'action@example.com', senderReplyTo: 'action-reply@example.com'},
            designSender: {sender_name: 'Design Sender', sender_email: 'design@example.com', sender_reply_to: 'design-reply@example.com'},
            defaultNewsletterSenderOptions: DEFAULTS
        });

        assert.equal(sendOptions.from, '"Action Sender" <action@example.com>');
        assert.equal(sendOptions.replyTo, 'action-reply@example.com');

        // The UI still shows the design-tier values (what the modal edits), not
        // the per-action override.
        assert.equal(ui.senderNameInput, 'Design Sender');
        assert.equal(ui.senderEmailInput, 'design@example.com');
        assert.equal(ui.replyToEmailInput, 'design-reply@example.com');
    });

    it('exposes managed-email UI flags (self-hoster: email input shown, no domain)', function () {
        const {ui} = resolveSender({
            designSender: {sender_name: 'Design Sender', sender_email: 'design@example.com', sender_reply_to: 'reply@example.com'},
            defaultNewsletterSenderOptions: DEFAULTS
        });

        assert.equal(ui.showSenderEmailInput, true);
        assert.equal(ui.senderEmailDomain, null);
        assert.equal(ui.hasDistinctReplyTo, true);
    });

    it('hides the sender email input under managed email without a sending domain', function () {
        emailAddressService.service = new EmailAddressService({
            getManagedEmailEnabled: () => true,
            getSendingDomain: () => null,
            getFallbackDomain: () => null,
            getDefaultEmail: () => ({address: 'default@example.com', name: 'Default'}),
            getFallbackEmail: () => null,
            getMembersSupportAddress: () => 'support@example.com',
            isValidEmailAddress: () => true
        });

        const {ui} = resolveSender({defaultNewsletterSenderOptions: DEFAULTS});

        assert.equal(ui.showSenderEmailInput, false);
        assert.equal(ui.senderEmailDomain, null);
    });

    it('reports the sending domain under managed email with a custom domain', function () {
        emailAddressService.service = new EmailAddressService({
            getManagedEmailEnabled: () => true,
            getSendingDomain: () => 'send.example.com',
            getFallbackDomain: () => null,
            getDefaultEmail: () => ({address: 'default@example.com', name: 'Default'}),
            getFallbackEmail: () => null,
            getMembersSupportAddress: () => 'support@example.com',
            isValidEmailAddress: () => true
        });

        const {ui} = resolveSender({defaultNewsletterSenderOptions: DEFAULTS});

        assert.equal(ui.showSenderEmailInput, true);
        assert.equal(ui.senderEmailDomain, 'send.example.com');
    });
});
