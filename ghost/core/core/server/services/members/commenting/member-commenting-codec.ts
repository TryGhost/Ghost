import {MemberCommenting} from './member-commenting';

interface StoredCommenting {
    disabled: boolean;
    disabledReason: string | null;
    disabledUntil: string | null;
}

/**
 * Codec for bidirectional serialization of MemberCommenting.
 * Handles conversion between domain objects and persistence format.
 */
interface SerializedCommenting {
    disabled: boolean;
    disabled_reason: string | null;
    disabled_until: string | null;
}

export const MemberCommentingCodec = {
    /**
     * Parse a raw JSON string from storage into a MemberCommenting domain object.
     * Invalid data fails open to enabled state.
     */
    parse(raw: string | null): MemberCommenting {
        try {
            const data: StoredCommenting = JSON.parse(raw ?? '');

            if (!data.disabled) {
                return MemberCommenting.enabled();
            }

            if (!data.disabledReason) {
                throw undefined;
            }

            const disabledUntil = data.disabledUntil ? new Date(data.disabledUntil) : null;
            if (disabledUntil && isNaN(disabledUntil.getTime())) {
                throw undefined;
            }

            return MemberCommenting.disabled(data.disabledReason, disabledUntil);
        } catch {
            return MemberCommenting.enabled();
        }
    },

    /**
     * Format a MemberCommenting domain object into a JSON string for storage.
     */
    format(commenting: MemberCommenting): string {
        return JSON.stringify({
            disabled: commenting.disabled,
            disabledReason: commenting.disabledReason,
            disabledUntil: commenting.disabledUntil?.toISOString() ?? null
        });
    },

    /**
     * Serialize a MemberCommenting domain object for API responses.
     * Converts camelCase domain properties to snake_case API format.
     */
    toJSON(commenting: MemberCommenting | null): SerializedCommenting | null {
        if (!commenting) {
            return commenting;
        }

        return {
            disabled: commenting.disabled,
            disabled_reason: commenting.disabledReason,
            disabled_until: commenting.disabledUntil?.toISOString() ?? null
        };
    }
};
