const MEMBER_WELCOME_EMAIL_LOG_KEY = '[MEMBER-WELCOME-EMAIL]';

const MEMBER_WELCOME_EMAIL_SLUGS = {
    free: 'member-welcome-email-free',
    paid: 'member-welcome-email-paid'
};

const MESSAGES = {
    NO_MEMBER_WELCOME_EMAIL: 'No member welcome email found',
    INVALID_LEXICAL_STRUCTURE: 'Member welcome email has invalid content structure',
    MISSING_EMAIL_CONTENT: 'Email content is required to send a test email',
    MISSING_EMAIL_SUBJECT: 'Email subject is required to send a test email',
    MISSING_RECIPIENT_EMAIL: 'Cannot send welcome email: no recipient email address available',
    memberWelcomeEmailInactive: memberStatus => `Member welcome email for "${memberStatus}" members is inactive`
};

module.exports = {
    MEMBER_WELCOME_EMAIL_LOG_KEY,
    MEMBER_WELCOME_EMAIL_SLUGS,
    MESSAGES
};
