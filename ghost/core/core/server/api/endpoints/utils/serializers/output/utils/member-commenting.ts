import type {MemberCommenting} from '../../../../../../services/members/commenting/member-commenting';

interface SerializedCommenting {
    disabled: boolean;
    disabled_reason: string | null;
    disabled_until: string | null;
}

/**
 * Serializes a MemberCommenting domain instance for API responses.
 * Converts camelCase domain properties to snake_case API format.
 */
export function serializeCommenting(commenting: MemberCommenting | null): SerializedCommenting | null {
    if (!commenting) {
        return commenting;
    }

    return {
        disabled: commenting.disabled,
        disabled_reason: commenting.disabledReason,
        disabled_until: commenting.disabledUntil?.toISOString() ?? null
    };
}
