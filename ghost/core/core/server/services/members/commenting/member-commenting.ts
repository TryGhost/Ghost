import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
    reasonRequired: 'A reason is required when disabling commenting for a member',
    reasonTooLong: 'Reason must be 2000 characters or less'
};

interface MemberCommentingData {
    disabled: boolean;
    disabledReason: string | null;
    disabledUntil: Date | null;
}

export class MemberCommenting {
    disabled: boolean;
    disabledReason: string | null;
    disabledUntil: Date | null;
    canComment: boolean;

    constructor(data: MemberCommentingData) {
        if (data.disabled && !data.disabledReason) {
            throw new errors.ValidationError({
                message: tpl(messages.reasonRequired),
                property: 'reason'
            });
        }

        if (data.disabledReason && data.disabledReason.length > 2000) {
            throw new errors.ValidationError({
                message: tpl(messages.reasonTooLong),
                property: 'reason'
            });
        }

        this.disabled = data.disabled;
        this.disabledReason = data.disabledReason;
        this.disabledUntil = data.disabledUntil;

        this.canComment = true;
        if (this.disabled) {
            this.canComment = this.disabledUntil ? this.disabledUntil <= new Date() : false;
        }
    }

    static enabled(): MemberCommenting {
        return new MemberCommenting({
            disabled: false,
            disabledReason: null,
            disabledUntil: null
        });
    }

    static disabled(reason: string, until: Date | null): MemberCommenting {
        return new MemberCommenting({
            disabled: true,
            disabledReason: reason,
            disabledUntil: until
        });
    }

    enable(): MemberCommenting {
        return MemberCommenting.enabled();
    }

    disable(reason: string, until: Date | null): MemberCommenting {
        return MemberCommenting.disabled(reason, until);
    }
}
