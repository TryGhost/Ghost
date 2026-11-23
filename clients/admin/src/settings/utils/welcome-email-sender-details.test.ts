import { resolveWelcomeEmailSenderDetails } from '@/settings/utils/welcome-email-sender-details';
import type { Config } from '@tryghost/admin-x-framework/api/config';

const config = {
  version: '1.0.0',
  environment: 'development',
  signupForm: { url: '', version: '' },
  enableDeveloperExperiments: false,
  database: 'sqlite',
  labs: {},
  stripeDirect: false,
  mail: '',
} as Config;

describe('resolveWelcomeEmailSenderDetails', function () {
  it('prefills from free welcome email before paid', function () {
    const result = resolveWelcomeEmailSenderDetails({
      automatedEmails: [
        {
          slug: 'member-welcome-email-paid',
          sender_name: 'Paid Sender',
          sender_email: 'paid@example.com',
          sender_reply_to: 'paid-reply@example.com',
        },
        {
          slug: 'member-welcome-email-free',
          sender_name: 'Free Sender',
          sender_email: 'free@example.com',
          sender_reply_to: 'free-reply@example.com',
        },
      ],
      config,
      defaultEmailAddress: 'default@example.com',
      newsletter: {
        sender_name: 'Newsletter Sender',
        sender_email: null,
        sender_reply_to: 'support',
      },
      siteTitle: 'My Site',
      supportEmailAddress: 'support@example.com',
    });

    expect(result.senderNameInput).toBe('Free Sender');
    expect(result.senderEmailInput).toBe('free@example.com');
    expect(result.replyToEmailInput).toBe('free-reply@example.com');
  });

  it('uses support address placeholder when newsletter reply-to is support', function () {
    const result = resolveWelcomeEmailSenderDetails({
      automatedEmails: [],
      config,
      defaultEmailAddress: 'default@example.com',
      newsletter: {
        sender_name: 'Sender',
        sender_email: 'test@example.com',
        sender_reply_to: 'support',
      },
      siteTitle: 'My Site',
      supportEmailAddress: 'support@example.com',
    });

    expect(result.replyToEmailPlaceholder).toBe('support@example.com');
  });

  it('uses sender-email placeholder when newsletter reply-to is newsletter', function () {
    const result = resolveWelcomeEmailSenderDetails({
      automatedEmails: [],
      config,
      defaultEmailAddress: 'default@example.com',
      newsletter: {
        sender_name: 'Sender',
        sender_email: 'test@example.com',
        sender_reply_to: 'newsletter',
      },
      siteTitle: 'My Site',
      supportEmailAddress: 'noreply@example.com',
    });

    expect(result.senderEmailPlaceholder).toBe('test@example.com');
    expect(result.replyToEmailPlaceholder).toBe('test@example.com');
  });

  it('uses explicit newsletter reply-to placeholder when set', function () {
    const result = resolveWelcomeEmailSenderDetails({
      automatedEmails: [],
      config,
      defaultEmailAddress: 'default@example.com',
      newsletter: {
        sender_name: 'Sender',
        sender_email: 'test@example.com',
        sender_reply_to: 'custom-reply@example.com',
      },
      siteTitle: 'My Site',
      supportEmailAddress: 'support@example.com',
    });

    expect(result.replyToEmailPlaceholder).toBe('custom-reply@example.com');
  });

  it('keeps automated reply-to prefill over placeholder', function () {
    const result = resolveWelcomeEmailSenderDetails({
      automatedEmails: [
        {
          slug: 'member-welcome-email-free',
          sender_name: null,
          sender_email: null,
          sender_reply_to: 'prefilled-reply@example.com',
        },
      ],
      config,
      defaultEmailAddress: 'default@example.com',
      newsletter: {
        sender_name: 'Sender',
        sender_email: 'test@example.com',
        sender_reply_to: 'support',
      },
      siteTitle: 'My Site',
      supportEmailAddress: 'support@example.com',
    });

    expect(result.replyToEmailInput).toBe('prefilled-reply@example.com');
    expect(result.resolvedReplyToEmail).toBe('prefilled-reply@example.com');
  });
});
