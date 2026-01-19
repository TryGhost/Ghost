export class MemberCommenting {
    readonly canComment: boolean;

    constructor(
        public readonly disabled: boolean,
        public readonly disabledReason: string | null,
        public readonly disabledUntil: Date | null
    ) {
        // Business logic: compute canComment
        this.canComment = !disabled ||
            (disabledUntil !== null && disabledUntil <= new Date());
    }

    // Immutable mutation methods - return new instances
    disable(reason: string, until: Date | null): MemberCommenting {
        return new MemberCommenting(true, reason, until);
    }

    enable(): MemberCommenting {
        return new MemberCommenting(false, null, null);
    }
}
