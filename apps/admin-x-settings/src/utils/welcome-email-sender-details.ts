import {type Config, hasSendingDomain, isManagedEmail, sendingDomain} from '@tryghost/admin-x-framework/api/config';
import {WELCOME_EMAIL_SLUGS} from '../components/settings/membership/member-emails/default-welcome-email-values';
import {renderReplyToEmailPlaceholder, renderSenderEmail} from './newsletter-emails';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import type {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';

type AutomatedEmailSenderFields = Pick<AutomatedEmail, 'slug' | 'sender_name' | 'sender_email' | 'sender_reply_to'>;
type NewsletterSenderFields = Pick<Newsletter, 'sender_name' | 'sender_email' | 'sender_reply_to'>;

export interface ResolveWelcomeEmailSenderDetailsInput {
    automatedEmails?: AutomatedEmailSenderFields[];
    config: Config;
    defaultEmailAddress?: string | null;
    newsletter?: NewsletterSenderFields | null;
    siteTitle?: string | null;
    supportEmailAddress?: string | null;
}

const trimValue = (value: string | null | undefined) => value?.trim() || '';

const firstNonEmpty = (...values: Array<string | null | undefined>) => {
    const normalized = values.map(trimValue);
    return normalized.find(Boolean) || '';
};

export const resolveWelcomeEmailSenderDetails = ({
    automatedEmails = [],
    config,
    defaultEmailAddress,
    newsletter,
    siteTitle,
    supportEmailAddress
}: ResolveWelcomeEmailSenderDetailsInput) => {
    const freeEmail = automatedEmails.find(email => email.slug === WELCOME_EMAIL_SLUGS.free);
    const paidEmail = automatedEmails.find(email => email.slug === WELCOME_EMAIL_SLUGS.paid);

    const senderNameInput = firstNonEmpty(freeEmail?.sender_name, paidEmail?.sender_name);
    const senderEmailInput = firstNonEmpty(freeEmail?.sender_email, paidEmail?.sender_email);
    const replyToEmailInput = firstNonEmpty(freeEmail?.sender_reply_to, paidEmail?.sender_reply_to);

    const defaultNewsletterSenderName = trimValue(newsletter?.sender_name);
    const defaultNewsletterSenderEmail = newsletter ? trimValue(renderSenderEmail(newsletter, config, defaultEmailAddress || undefined)) : '';
    const defaultNewsletterReplyTo = newsletter ? trimValue(renderReplyToEmailPlaceholder(newsletter, config, supportEmailAddress || undefined, defaultEmailAddress || undefined)) : '';

    const senderNamePlaceholder = defaultNewsletterSenderName || trimValue(siteTitle) || 'Your site name';
    const senderEmailPlaceholder = defaultNewsletterSenderEmail || trimValue(defaultEmailAddress);
    const replyToEmailPlaceholder = defaultNewsletterReplyTo || trimValue(supportEmailAddress) || trimValue(defaultEmailAddress);

    const resolvedSenderName = senderNameInput || senderNamePlaceholder || 'Your Site';
    const resolvedSenderEmail = senderEmailInput || senderEmailPlaceholder || '';
    const resolvedReplyToEmail = replyToEmailInput || replyToEmailPlaceholder || '';
    const hasDistinctReplyTo = resolvedReplyToEmail !== '' && resolvedReplyToEmail !== resolvedSenderEmail;

    const managedEmail = isManagedEmail(config);
    const hasManagedSendingDomain = hasSendingDomain(config);

    return {
        hasDistinctReplyTo,
        replyToEmailInput,
        replyToEmailPlaceholder,
        resolvedReplyToEmail,
        resolvedSenderEmail,
        resolvedSenderName,
        senderEmailDomain: hasManagedSendingDomain ? sendingDomain(config) : null,
        senderEmailInput,
        senderEmailPlaceholder,
        senderNameInput,
        senderNamePlaceholder,
        showSenderEmailInput: !managedEmail || hasManagedSendingDomain
    };
};
