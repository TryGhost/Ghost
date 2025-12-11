const MEMBER_WELCOME_EMAIL_LOG_KEY = '[MEMBER-WELCOME-EMAIL]';

const MEMBER_WELCOME_EMAIL_SLUGS = {
    free: 'member-welcome-email-free',
    paid: 'member-welcome-email-paid'
};

// Sources that are allowed to trigger welcome emails
// Only 'member' source (self-signup) should trigger welcome emails
// Excludes: 'import', 'admin', 'api' to prevent emails during bulk operations
const WELCOME_EMAIL_SOURCES = ['member'];

const MESSAGES = {
    NO_MEMBER_WELCOME_EMAIL: 'No member welcome email found',
    INVALID_LEXICAL_STRUCTURE: 'Member welcome email has invalid content structure',
    MISSING_TEST_INBOX_CONFIG: 'memberWelcomeEmailTestInbox config is required but not defined',
    memberWelcomeEmailInactive: memberStatus => `Member welcome email for "${memberStatus}" members is inactive`
};

module.exports = {
    MEMBER_WELCOME_EMAIL_LOG_KEY,
    MEMBER_WELCOME_EMAIL_SLUGS,
    MESSAGES,
    WELCOME_EMAIL_SOURCES
};
