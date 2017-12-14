/**
 * Parse Context
 *
 * Utility function, to expand strings out into objects.
 * @param {Object|String} context
 * @return {{internal: boolean, external: boolean, user: integer|null, app: integer|null, public: boolean}}
 */
module.exports = function parseContext(context) {
    // Parse what's passed to canThis.beginCheck for standard user and app scopes
    var parsed = {
        internal: false,
        external: false,
        user: null,
        app: null,
        public: true
    };

    // NOTE: We use the `external` context for subscribers only at the moment.
    if (context && (context === 'external' || context.external)) {
        parsed.external = true;
        parsed.public = false;
    }

    if (context && (context === 'internal' || context.internal)) {
        parsed.internal = true;
        parsed.public = false;
    }

    if (context && context.user) {
        parsed.user = context.user;
        parsed.public = false;
    }

    if (context && context.app) {
        parsed.app = context.app;
        parsed.public = false;
    }

    return parsed;
};
