import {type Config, hasSendingDomain} from '@tryghost/admin-x-framework/api/config';
import {normalizeAutomationSenderReplyTo, normalizeNewsletterSenderReplyTo, renderReplyToEmail, renderSenderEmail, shouldShowSenderEmailField, validateAutomationReplyTo, validateNewsletterReplyTo, validateSenderEmail} from '@src/utils/newsletter-emails';

type SenderFields = {
    sender_email: string;
    sender_reply_to: string;
};

type NewsletterSenderDefaults = {
    sender_email: string | null;
    sender_reply_to: string | null;
};

type EmailContext = {
    config: Config;
    defaultEmailAddress?: string;
    supportEmailAddress?: string;
};

const trimValue = (value: string) => value.trim();

export const getSenderFieldContext = ({
    config,
    defaultEmailAddress,
    renderedSenderEmail,
    renderedReplyTo
}: {
    config: Config;
    defaultEmailAddress?: string;
    renderedSenderEmail: string;
    renderedReplyTo: string;
}) => ({
    showSenderEmailField: shouldShowSenderEmailField(config),
    senderEmailPlaceholder: hasSendingDomain(config) ? (defaultEmailAddress || '') : renderedSenderEmail,
    replyToPlaceholder: renderedSenderEmail,
    renderedReplyToValue: renderedReplyTo
});

export const resolveNewsletterSenderInfo = ({
    sender,
    context
}: {
    sender: SenderFields;
    context: EmailContext;
}) => {
    const senderEmail = trimValue(sender.sender_email) || null;
    const senderReplyTo = normalizeNewsletterSenderReplyTo(sender.sender_reply_to);

    const renderedSenderEmail = renderSenderEmail({sender_email: senderEmail}, context.config, context.defaultEmailAddress);
    const renderedReplyTo = renderReplyToEmail({sender_email: senderEmail, sender_reply_to: senderReplyTo}, context.config, context.supportEmailAddress, context.defaultEmailAddress);

    return {
        renderedSenderEmail,
        renderedReplyTo
    };
};

export const resolveAutomationSenderInfo = ({
    sender,
    fallbackNewsletter,
    context
}: {
    sender: SenderFields;
    fallbackNewsletter?: NewsletterSenderDefaults;
    context: EmailContext;
}) => {
    const senderEmail = trimValue(sender.sender_email);
    const senderReplyTo = trimValue(sender.sender_reply_to);

    const fallbackSenderEmail = fallbackNewsletter ?
        renderSenderEmail({sender_email: fallbackNewsletter.sender_email}, context.config, context.defaultEmailAddress) :
        '';
    const fallbackReplyTo = fallbackNewsletter ?
        renderReplyToEmail(fallbackNewsletter, context.config, context.supportEmailAddress, context.defaultEmailAddress) :
        '';

    const renderedSenderEmail = senderEmail || fallbackSenderEmail || context.defaultEmailAddress || '';
    const renderedReplyTo = senderReplyTo || fallbackReplyTo || '';

    return {
        renderedSenderEmail,
        renderedReplyTo
    };
};

export const validateNewsletterSenderFields = ({
    senderEmail,
    senderReplyTo,
    config
}: {
    senderEmail: string;
    senderReplyTo: string;
    config: Config;
}) => ({
    senderEmailError: validateSenderEmail(senderEmail, config),
    senderReplyToError: validateNewsletterReplyTo(senderReplyTo)
});

export const validateAutomationSenderFields = ({
    senderEmail,
    senderReplyTo,
    config
}: {
    senderEmail: string;
    senderReplyTo: string;
    config: Config;
}) => ({
    senderEmailError: validateSenderEmail(senderEmail, config),
    senderReplyToError: validateAutomationReplyTo(senderReplyTo)
});

export const normalizeNewsletterSenderPayload = ({
    sender_email: senderEmail,
    sender_reply_to: senderReplyTo
}: SenderFields) => ({
    sender_email: trimValue(senderEmail) || null,
    sender_reply_to: normalizeNewsletterSenderReplyTo(senderReplyTo)
});

export const normalizeAutomationSenderPayload = ({
    sender_email: senderEmail,
    sender_reply_to: senderReplyTo
}: SenderFields) => ({
    sender_email: trimValue(senderEmail) || null,
    sender_reply_to: normalizeAutomationSenderReplyTo(senderReplyTo)
});
