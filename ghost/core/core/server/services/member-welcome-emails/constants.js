const MEMBER_WELCOME_EMAIL_LOG_KEY = '[MEMBER-WELCOME-EMAIL]';

const MESSAGES = {
    NO_EMAIL_TEMPLATE: 'No email template found for member welcome email',
    INVALID_LEXICAL_STRUCTURE: 'Welcome email template has invalid content structure',
    MISSING_TEST_INBOX_CONFIG: 'memberWelcomeEmailTestInbox config is required but not defined'
};

module.exports = {
    MEMBER_WELCOME_EMAIL_LOG_KEY,
    MESSAGES
};
