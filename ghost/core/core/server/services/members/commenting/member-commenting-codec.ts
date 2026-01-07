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
    }
};
