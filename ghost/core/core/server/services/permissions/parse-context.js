/**
 * Parse Context
 *
 * Utility function, to expand strings out into objects.
 * @param {Object|String} context
 * @return {{internal: boolean, user: integer|null, public: boolean, api_key: Object|null}}
 */
module.exports = function parseContext(context) {
    const parsed = {
        internal: false,
        user: null,
        api_key: null,
        integration: null,
        member: null,
        public: true
    };

    if (context && (context === 'internal' || context.internal)) {
        parsed.internal = true;
        parsed.public = false;
    }

    if (context && context.user) {
        parsed.user = context.user;
        parsed.public = false;
    }

    if (context && context.api_key) {
        parsed.api_key = context.api_key;
        parsed.integration = context.integration;
        parsed.public = (context.api_key.type === 'content');
    }

    if (context && context.member) {
        parsed.member = context.member;
    }

    return parsed;
};
