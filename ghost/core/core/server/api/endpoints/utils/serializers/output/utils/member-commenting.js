/**
 * Serializes a MemberCommenting domain instance for API responses.
 * Converts camelCase domain properties to snake_case API format.
 *
 * @param {Object|null} commenting - MemberCommenting instance or null
 * @returns {Object|null} Serialized commenting object with snake_case keys
 */
function serializeCommenting(commenting) {
    if (!commenting) {
        return commenting;
    }

    return {
        disabled: commenting.disabled,
        disabled_reason: commenting.disabledReason,
        disabled_until: commenting.disabledUntil?.toISOString() ?? null
    };
}

module.exports = {
    serializeCommenting
};
