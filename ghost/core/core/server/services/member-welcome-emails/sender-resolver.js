const emailAddressService = require('../email-address');
const EmailAddressParser = require('../email-address/email-address-parser');
const settingsCache = require('../../../shared/settings-cache');

const trimValue = value => (typeof value === 'string' ? value.trim() : value) || '';

const firstNonEmpty = (...values) => {
    for (const value of values) {
        const trimmed = trimValue(value);
        if (trimmed) {
            return trimmed;
        }
    }
    return '';
};

/**
 * The single source of truth for resolving automated-email sender details
 * through the cascade, nearest-first:
 *
 *   per-action override  ->  design tier  ->  default newsletter  ->  site
 *
 * Used both at send time (returns `sendOptions` for the mailer) and by the
 * design read endpoint (returns the `ui` payload the modal renders: explicit
 * design-tier inputs vs resolved placeholders, plus managed-email flags). It
 * absorbs the old backend `#getEffectiveSenderOptions` and the going-away
 * frontend `resolveWelcomeEmailSenderDetails`.
 *
 * @param {object} args
 * @param {{senderName?: string|null, senderEmail?: string|null, senderReplyTo?: string|null}} [args.actionSender]
 *   Per-action override (null today for welcome emails; the top cascade tier).
 * @param {{sender_name?: string|null, sender_email?: string|null, sender_reply_to?: string|null}|null} [args.designSender]
 *   The design-tier sender from email_design_settings.
 * @param {{from?: string, replyTo?: string}} [args.defaultNewsletterSenderOptions]
 *   Stringified default newsletter/site sender, as produced by the service.
 * @returns {{sendOptions: {from: string, replyTo?: string}, ui: object}}
 */
function resolveSender({actionSender = {}, designSender = null, defaultNewsletterSenderOptions = {}} = {}) {
    const service = emailAddressService.service;

    const defaultFrom = EmailAddressParser.parse(defaultNewsletterSenderOptions.from || '') || service.defaultFromEmail;
    const defaultReplyTo = defaultNewsletterSenderOptions.replyTo
        ? EmailAddressParser.parse(defaultNewsletterSenderOptions.replyTo)
        : undefined;

    // Explicit design-tier values: what the design modal shows in its inputs.
    const senderNameInput = trimValue(designSender && designSender.sender_name);
    const senderEmailInput = trimValue(designSender && designSender.sender_email);
    const replyToEmailInput = trimValue(designSender && designSender.sender_reply_to);

    // Placeholders: the resolved fallback shown when an input is empty.
    const senderNamePlaceholder = (defaultFrom && defaultFrom.name) || settingsCache.get('title') || 'Your site name';
    const senderEmailPlaceholder = (defaultFrom && defaultFrom.address) || '';
    const replyToEmailPlaceholder = (defaultReplyTo && defaultReplyTo.address) || (defaultFrom && defaultFrom.address) || '';

    // Effective values walk the full cascade, nearest-first.
    const effectiveName = firstNonEmpty(actionSender.senderName, senderNameInput) || (defaultFrom && defaultFrom.name) || undefined;
    const effectiveEmail = firstNonEmpty(actionSender.senderEmail, senderEmailInput) || defaultFrom.address;
    const effectiveReplyTo = firstNonEmpty(actionSender.senderReplyTo, replyToEmailInput);

    const addresses = service.getAddress({
        from: {
            address: effectiveEmail,
            ...(effectiveName ? {name: effectiveName} : {})
        },
        replyTo: effectiveReplyTo ? {address: effectiveReplyTo} : defaultReplyTo
    });

    const from = EmailAddressParser.stringify(addresses.from);
    const replyTo = addresses.replyTo ? EmailAddressParser.stringify(addresses.replyTo) : undefined;

    const managedEmail = service.managedEmailEnabled;
    const sendingDomain = service.sendingDomain;
    const resolvedSenderEmail = senderEmailInput || senderEmailPlaceholder;
    const resolvedReplyToEmail = replyToEmailInput || replyToEmailPlaceholder;

    return {
        sendOptions: {
            from,
            ...(replyTo ? {replyTo} : {})
        },
        ui: {
            senderNameInput,
            senderEmailInput,
            replyToEmailInput,
            senderNamePlaceholder,
            senderEmailPlaceholder,
            replyToEmailPlaceholder,
            // Resolved single values (input || placeholder) for read-only display,
            // e.g. the email action editor's From/Reply-to header.
            resolvedSenderName: senderNameInput || senderNamePlaceholder,
            resolvedSenderEmail,
            resolvedReplyToEmail,
            showSenderEmailInput: !managedEmail || Boolean(sendingDomain),
            senderEmailDomain: managedEmail && sendingDomain ? sendingDomain : null,
            hasDistinctReplyTo: resolvedReplyToEmail !== '' && resolvedReplyToEmail !== resolvedSenderEmail
        }
    };
}

module.exports = {resolveSender};
