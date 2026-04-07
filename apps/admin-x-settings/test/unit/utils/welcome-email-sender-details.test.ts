import * as assert from 'assert/strict';
import {resolveWelcomeEmailSenderDetails} from '@src/utils/welcome-email-sender-details';
import type {Config} from '@tryghost/admin-x-framework/api/config';

const config = {
    version: '1.0.0',
    environment: 'development',
    editor: {url: '', version: ''},
    signupForm: {url: '', version: ''},
    enableDeveloperExperiments: false,
    database: 'sqlite',
    labs: {},
    stripeDirect: false,
    mail: ''
} as Config;

describe('resolveWelcomeEmailSenderDetails', function () {
    it('prefills from free welcome email before paid', function () {
        const result = resolveWelcomeEmailSenderDetails({
            automatedEmails: [
                {
                    slug: 'member-welcome-email-paid',
                    sender_name: 'Paid Sender',
                    sender_email: 'paid@example.com',
                    sender_reply_to: 'paid-reply@example.com'
                },
                {
                    slug: 'member-welcome-email-free',
                    sender_name: 'Free Sender',
                    sender_email: 'free@example.com',
                    sender_reply_to: 'free-reply@example.com'
                }
            ],
            config,
            defaultEmailAddress: 'default@example.com',
            newsletter: {
                sender_name: 'Newsletter Sender',
                sender_email: null,
                sender_reply_to: 'support'
            },
            siteTitle: 'My Site',
            supportEmailAddress: 'support@example.com'
        });

        assert.equal(result.senderNameInput, 'Free Sender');
        assert.equal(result.senderEmailInput, 'free@example.com');
        assert.equal(result.replyToEmailInput, 'free-reply@example.com');
    });

    it('uses support address placeholder when newsletter reply-to is support', function () {
        const result = resolveWelcomeEmailSenderDetails({
            automatedEmails: [],
            config,
            defaultEmailAddress: 'default@example.com',
            newsletter: {
                sender_name: 'Sender',
                sender_email: 'test@example.com',
                sender_reply_to: 'support'
            },
            siteTitle: 'My Site',
            supportEmailAddress: 'support@example.com'
        });

        assert.equal(result.replyToEmailPlaceholder, 'support@example.com');
    });

    it('uses sender-email placeholder when newsletter reply-to is newsletter', function () {
        const result = resolveWelcomeEmailSenderDetails({
            automatedEmails: [],
            config,
            defaultEmailAddress: 'default@example.com',
            newsletter: {
                sender_name: 'Sender',
                sender_email: 'test@example.com',
                sender_reply_to: 'newsletter'
            },
            siteTitle: 'My Site',
            supportEmailAddress: 'noreply@example.com'
        });

        assert.equal(result.senderEmailPlaceholder, 'test@example.com');
        assert.equal(result.replyToEmailPlaceholder, 'test@example.com');
    });

    it('uses explicit newsletter reply-to placeholder when set', function () {
        const result = resolveWelcomeEmailSenderDetails({
            automatedEmails: [],
            config,
            defaultEmailAddress: 'default@example.com',
            newsletter: {
                sender_name: 'Sender',
                sender_email: 'test@example.com',
                sender_reply_to: 'custom-reply@example.com'
            },
            siteTitle: 'My Site',
            supportEmailAddress: 'support@example.com'
        });

        assert.equal(result.replyToEmailPlaceholder, 'custom-reply@example.com');
    });

    it('keeps automated reply-to prefill over placeholder', function () {
        const result = resolveWelcomeEmailSenderDetails({
            automatedEmails: [{
                slug: 'member-welcome-email-free',
                sender_name: null,
                sender_email: null,
                sender_reply_to: 'prefilled-reply@example.com'
            }],
            config,
            defaultEmailAddress: 'default@example.com',
            newsletter: {
                sender_name: 'Sender',
                sender_email: 'test@example.com',
                sender_reply_to: 'support'
            },
            siteTitle: 'My Site',
            supportEmailAddress: 'support@example.com'
        });

        assert.equal(result.replyToEmailInput, 'prefilled-reply@example.com');
        assert.equal(result.resolvedReplyToEmail, 'prefilled-reply@example.com');
    });
});

